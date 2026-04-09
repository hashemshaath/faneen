
-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.account_type AS ENUM ('individual', 'business', 'company');
CREATE TYPE public.membership_tier AS ENUM ('free', 'basic', 'premium', 'enterprise');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Countries table
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(3) NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'SAR',
  currency_name_ar TEXT NOT NULL DEFAULT 'ريال سعودي',
  currency_name_en TEXT NOT NULL DEFAULT 'Saudi Riyal',
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  phone_code VARCHAR(5) NOT NULL DEFAULT '+966',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Countries are viewable by everyone" ON public.countries FOR SELECT USING (true);

-- Cities table
CREATE TABLE public.cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cities are viewable by everyone" ON public.cities FOR SELECT USING (true);

-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon TEXT,
  parent_id UUID REFERENCES public.categories(id),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type account_type NOT NULL DEFAULT 'individual',
  full_name TEXT,
  phone VARCHAR(20) NOT NULL,
  email TEXT,
  avatar_url TEXT,
  country_id UUID REFERENCES public.countries(id),
  city_id UUID REFERENCES public.cities(id),
  preferred_language VARCHAR(2) NOT NULL DEFAULT 'ar',
  membership_tier membership_tier NOT NULL DEFAULT 'free',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Businesses table
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  logo_url TEXT,
  cover_url TEXT,
  phone VARCHAR(20),
  email TEXT,
  website TEXT,
  country_id UUID REFERENCES public.countries(id),
  city_id UUID REFERENCES public.cities(id),
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  category_id UUID REFERENCES public.categories(id),
  membership_tier membership_tier NOT NULL DEFAULT 'free',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Businesses are viewable by everyone" ON public.businesses FOR SELECT USING (is_active = true);
CREATE POLICY "Users can insert their own business" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own business" ON public.businesses FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- User roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed Saudi Arabia and cities
INSERT INTO public.countries (code, name_ar, name_en, currency_code, currency_name_ar, currency_name_en, tax_rate, phone_code)
VALUES ('SA', 'المملكة العربية السعودية', 'Saudi Arabia', 'SAR', 'ريال سعودي', 'Saudi Riyal', 15.00, '+966');

INSERT INTO public.cities (country_id, name_ar, name_en) VALUES
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'الرياض', 'Riyadh'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'جدة', 'Jeddah'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'مكة المكرمة', 'Makkah'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'المدينة المنورة', 'Madinah'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'الدمام', 'Dammam'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'الخبر', 'Khobar'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'الطائف', 'Taif'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'تبوك', 'Tabuk'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'بريدة', 'Buraidah'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'خميس مشيط', 'Khamis Mushait'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'أبها', 'Abha'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'حائل', 'Hail'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'نجران', 'Najran'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'جازان', 'Jazan'),
  ((SELECT id FROM public.countries WHERE code = 'SA'), 'ينبع', 'Yanbu');

-- Seed categories
INSERT INTO public.categories (slug, name_ar, name_en, description_ar, description_en, icon, sort_order) VALUES
  ('aluminum', 'الألمنيوم', 'Aluminum', 'نوافذ، أبواب، واجهات، شتر', 'Windows, doors, facades, shutters', 'Layers', 1),
  ('iron-steel', 'الحديد والاستيل', 'Iron & Steel', 'أبواب حديد، درابزين، هياكل', 'Iron doors, railings, structures', 'Shield', 2),
  ('glass', 'الزجاج', 'Glass', 'زجاج مزدوج، سيكوريت، مرايا', 'Double glass, securit, mirrors', 'Layers', 3),
  ('wood-cabinets', 'الخشب والخزائن', 'Wood & Cabinets', 'مطابخ، غرف ملابس، أبواب خشب', 'Kitchens, wardrobes, wooden doors', 'Building2', 4),
  ('accessories', 'الاكسسوارات', 'Accessories', 'مقابض، مفصلات، إغلاقات', 'Handles, hinges, closures', 'Wrench', 5),
  ('designers', 'المصممين', 'Designers', 'تصميم داخلي، رسومات هندسية', 'Interior design, engineering drawings', 'Users', 6);

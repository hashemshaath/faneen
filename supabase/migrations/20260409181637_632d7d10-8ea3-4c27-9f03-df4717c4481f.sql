
-- Projects table for service providers
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title_ar text NOT NULL,
  title_en text,
  description_ar text,
  description_en text,
  category_id uuid REFERENCES public.categories(id),
  city_id uuid REFERENCES public.cities(id),
  client_name text,
  project_cost numeric,
  currency_code varchar NOT NULL DEFAULT 'SAR',
  duration_days integer,
  completion_date date,
  cover_image_url text,
  status varchar NOT NULL DEFAULT 'published',
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published projects are viewable by everyone"
ON public.projects FOR SELECT USING (status = 'published');

CREATE POLICY "Business owners can insert projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM businesses WHERE id = projects.business_id AND user_id = auth.uid()));

CREATE POLICY "Business owners can update projects"
ON public.projects FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM businesses WHERE id = projects.business_id AND user_id = auth.uid()));

CREATE POLICY "Business owners can delete projects"
ON public.projects FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM businesses WHERE id = projects.business_id AND user_id = auth.uid()));

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Project images
CREATE TABLE public.project_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption_ar text,
  caption_en text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project images viewable by everyone"
ON public.project_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE id = project_images.project_id AND status = 'published')
);

CREATE POLICY "Business owners can manage project images"
ON public.project_images FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p JOIN businesses b ON b.id = p.business_id
  WHERE p.id = project_images.project_id AND b.user_id = auth.uid()
));

CREATE POLICY "Business owners can update project images"
ON public.project_images FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM projects p JOIN businesses b ON b.id = p.business_id
  WHERE p.id = project_images.project_id AND b.user_id = auth.uid()
));

CREATE POLICY "Business owners can delete project images"
ON public.project_images FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM projects p JOIN businesses b ON b.id = p.business_id
  WHERE p.id = project_images.project_id AND b.user_id = auth.uid()
));

-- Blog posts table (admin managed)
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  slug varchar NOT NULL UNIQUE,
  title_ar text NOT NULL,
  title_en text,
  content_ar text,
  content_en text,
  excerpt_ar text,
  excerpt_en text,
  cover_image_url text,
  category varchar NOT NULL DEFAULT 'general',
  tags text[] DEFAULT '{}',
  status varchar NOT NULL DEFAULT 'draft',
  views_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published blog posts viewable by everyone"
ON public.blog_posts FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage blog posts"
ON public.blog_posts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

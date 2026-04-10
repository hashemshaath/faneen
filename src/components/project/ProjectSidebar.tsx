import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign, Clock, Calendar, Building2, MapPin, Tag,
  Phone, Mail, Globe, MessageCircle, ExternalLink
} from 'lucide-react';

interface Props {
  project: any;
  category: any;
  city: any;
}

export const ProjectSidebar = ({ project, category, city }: Props) => {
  const { isRTL, language } = useLanguage();

  const detailItems = [
    { icon: DollarSign, label: isRTL ? 'تكلفة المشروع' : 'Project Cost', value: project.project_cost ? `${Number(project.project_cost).toLocaleString()} ${project.currency_code}` : null },
    { icon: Clock, label: isRTL ? 'مدة التنفيذ' : 'Duration', value: project.duration_days ? `${project.duration_days} ${isRTL ? 'يوم' : 'days'}` : null },
    { icon: Calendar, label: isRTL ? 'تاريخ الإنجاز' : 'Completion Date', value: project.completion_date },
    { icon: Building2, label: isRTL ? 'العميل' : 'Client', value: project.client_name },
    { icon: Tag, label: isRTL ? 'التصنيف' : 'Category', value: category ? (language === 'ar' ? category.name_ar : category.name_en) : null },
    { icon: MapPin, label: isRTL ? 'الموقع' : 'Location', value: city ? (language === 'ar' ? city.name_ar : city.name_en) : null },
  ].filter(i => i.value);

  const biz = project.businesses;
  const bizName = biz ? (language === 'ar' ? biz.name_ar : (biz.name_en || biz.name_ar)) : '';
  const bizDesc = biz ? (language === 'ar' ? (biz.short_description_ar || biz.description_ar) : (biz.short_description_en || biz.description_en || biz.short_description_ar || biz.description_ar)) : '';

  return (
    <div className="space-y-5">
      {/* Project Details Card */}
      <div className="rounded-xl border border-border/50 dark:border-border/30 bg-card dark:bg-card/80 p-4 sm:p-5 space-y-3">
        <h3 className="font-heading font-bold text-base sm:text-lg">{isRTL ? 'تفاصيل المشروع' : 'Project Details'}</h3>
        <div className="space-y-3">
          {detailItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent/10 dark:bg-accent/15 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-semibold text-sm truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business Provider Card */}
      {biz && (
        <div className="rounded-xl border border-border/50 dark:border-border/30 bg-card dark:bg-card/80 overflow-hidden">
          <div className="p-4 sm:p-5">
            <h3 className="font-heading font-bold text-base sm:text-lg mb-4">{isRTL ? 'مزود الخدمة' : 'Service Provider'}</h3>
            <Link to={`/${biz.username}`} className="flex items-center gap-3 group mb-3">
              {biz.logo_url ? (
                <img src={biz.logo_url} alt={bizName} className="w-14 h-14 rounded-xl object-cover border border-border/30 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-7 h-7 text-accent" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-accent group-hover:underline truncate">{bizName}</p>
                {biz.is_verified && (
                  <Badge variant="secondary" className="text-[10px] mt-0.5">{isRTL ? 'موثّق' : 'Verified'}</Badge>
                )}
              </div>
            </Link>

            {bizDesc && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3">{bizDesc}</p>
            )}

            {/* Contact info */}
            <div className="space-y-2">
              {biz.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span dir="ltr">{biz.phone}</span>
                </div>
              )}
              {biz.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{biz.email}</span>
                </div>
              )}
              {biz.website && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{biz.website}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="p-3 flex gap-2">
            <Link to={`/${biz.username}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                {isRTL ? 'الملف التجاري' : 'View Profile'}
              </Button>
            </Link>
            <Link to={`/${biz.username}`} className="flex-1">
              <Button size="sm" className="w-full text-xs gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                {isRTL ? 'تواصل' : 'Contact'}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

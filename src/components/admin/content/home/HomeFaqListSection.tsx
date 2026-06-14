import React from 'react';

export interface HomeFaqListSectionProps {
  children: React.ReactNode;
}

/**
 * HomeFaqListSection — pure list wrapper for FAQ rows. No data ops.
 */
export const HomeFaqListSection: React.FC<HomeFaqListSectionProps> = ({ children }) => (
  <div className="space-y-3">{children}</div>
);

export default HomeFaqListSection;
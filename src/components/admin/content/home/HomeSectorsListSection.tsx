import React from 'react';

export interface HomeSectorsListSectionProps {
  children: React.ReactNode;
}

/**
 * HomeSectorsListSection — pure list wrapper. Parent passes rendered
 * <HomeSectorRow /> children; this section adds no fetching/mutation.
 */
export const HomeSectorsListSection: React.FC<HomeSectorsListSectionProps> = ({ children }) => (
  <div className="space-y-4">{children}</div>
);

export default HomeSectorsListSection;
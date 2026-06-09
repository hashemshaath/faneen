/**
 * Wrapper that renders the full set of HomeCategoryRow entries.
 * Kept as a single lazy chunk so the page doesn't ship 7 separate
 * dynamic imports — the data is tiny and the component is purely
 * presentational.
 */
import HomeCategoryRow from './HomeCategoryRow';
import { HOME_CATEGORY_ROWS } from '../data/categoryRows';

const HomeCategoryRows = () => (
  <div>
    {HOME_CATEGORY_ROWS.map((row) => (
      <HomeCategoryRow key={row.id} row={row} />
    ))}
  </div>
);

export default HomeCategoryRows;
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileText } from 'lucide-react';
import { ClauseSection } from '../ClauseSection';

describe('ClauseSection', () => {
  it('renders title and number', () => {
    render(
      <ClauseSection icon={FileText} number={3} title="Scope">
        <p>Body</p>
      </ClauseSection>,
    );
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('toggles open/closed on click', () => {
    render(
      <ClauseSection icon={FileText} number={1} title="Terms">
        <p>Hidden body</p>
      </ClauseSection>,
    );
    expect(screen.queryByText('Hidden body')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Hidden body')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('Hidden body')).not.toBeInTheDocument();
  });

  it('respects defaultOpen', () => {
    render(
      <ClauseSection icon={FileText} number={2} title="Open" defaultOpen>
        <p>Visible body</p>
      </ClauseSection>,
    );
    expect(screen.getByText('Visible body')).toBeInTheDocument();
  });
});
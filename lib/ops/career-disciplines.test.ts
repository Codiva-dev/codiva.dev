import { describe, expect, it } from 'vitest';
import {
  isCareersPipelinePosting,
  isTesterJobSlug,
  isTesterPipelineItem,
  postingAsksDiscipline,
  postingHireOpsRole,
} from './career-disciplines';

describe('postingAsksDiscipline', () => {
  it('uses the posting flag when present', () => {
    expect(postingAsksDiscipline({ slug: 'tester', asks_discipline: false })).toBe(false);
    expect(postingAsksDiscipline({ slug: 'project-manager', asks_discipline: true })).toBe(true);
  });

  it('falls back to false when the flag is missing', () => {
    expect(postingAsksDiscipline('tester')).toBe(false);
    expect(postingAsksDiscipline('tester-qa')).toBe(false);
    expect(postingAsksDiscipline('project-manager')).toBe(false);
    expect(postingAsksDiscipline({ slug: 'tester' })).toBe(false);
  });
});

describe('isTesterJobSlug', () => {
  it('matches the current integral tester slug and the legacy one', () => {
    expect(isTesterJobSlug('tester')).toBe(true);
    expect(isTesterJobSlug('tester-qa')).toBe(true);
    expect(isTesterJobSlug('project-manager')).toBe(false);
  });
});

describe('isCareersPipelinePosting', () => {
  it('prefers the pipeline flag over the slug', () => {
    expect(isCareersPipelinePosting({ slug: 'project-manager', careers_pipeline: true })).toBe(true);
    expect(isCareersPipelinePosting({ slug: 'tester', careers_pipeline: false })).toBe(false);
    expect(isCareersPipelinePosting({ slug: 'tester' })).toBe(true);
  });
});

describe('isTesterPipelineItem', () => {
  it('lets careers_pipeline decide when it is set', () => {
    expect(
      isTesterPipelineItem({ postingSlug: 'project-manager', careersPipeline: true })
    ).toBe(true);
    expect(isTesterPipelineItem({ postingSlug: 'tester', careersPipeline: false })).toBe(false);
  });
});

describe('postingHireOpsRole', () => {
  it('uses the stored role and falls back from the slug', () => {
    expect(postingHireOpsRole({ hire_ops_role: 'pm' })).toBe('pm');
    expect(postingHireOpsRole('project-manager')).toBe('pm');
    expect(postingHireOpsRole('tester')).toBe('dev');
  });
});

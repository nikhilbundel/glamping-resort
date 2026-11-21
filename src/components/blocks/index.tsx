import { Fragment, type ComponentType } from 'react';
import { HomeLink } from '@/components/site/HomeLink';
import type { BlockCtx, BlockProps } from './types';
import { HeroBlock, SplitBlock, CtaBandBlock, RichTextBlock, FeatureListBlock, CardGridBlock, StatsBlock, TimelineBlock, TableBlock, GalleryBlock, VideoBlock, VideoReviewsBlock } from './layout-blocks';
import {
  ActivitiesBlock, SpecialArrangementsBlock, StaysGridBlock, RoomsBlock, AmenitiesBlock, AwardsBlock, TeamBlock, SpaTreatmentsBlock,
  CafeTimingsBlock, CafeMenuBlock, LatestPostsBlock, TestimonialsBlock, MediaMentionsBlock, InstagramBlock, FaqBlock, FaqBrowserBlock,
} from './collection-blocks';
import { ContactDetailsBlock, EnquiryFormBlock, MapBlock, NewsletterBlock } from './form-blocks';

const BLOCKS: Record<string, ComponentType<BlockProps> | ((p: BlockProps) => Promise<any>)> = {
  hero: HeroBlock,
  split: SplitBlock,
  ctaBand: CtaBandBlock,
  richText: RichTextBlock,
  featureList: FeatureListBlock,
  cardGrid: CardGridBlock,
  stats: StatsBlock,
  timeline: TimelineBlock,
  table: TableBlock,
  gallery: GalleryBlock,
  video: VideoBlock,
  videoReviews: VideoReviewsBlock,
  activities: ActivitiesBlock,
  specialArrangements: SpecialArrangementsBlock,
  staysGrid: StaysGridBlock,
  rooms: RoomsBlock,
  amenities: AmenitiesBlock,
  awards: AwardsBlock,
  team: TeamBlock,
  spaTreatments: SpaTreatmentsBlock,
  cafeTimings: CafeTimingsBlock,
  cafeMenu: CafeMenuBlock,
  latestPosts: LatestPostsBlock,
  testimonials: TestimonialsBlock,
  mediaMentions: MediaMentionsBlock,
  instagram: InstagramBlock,
  faq: FaqBlock,
  faqBrowser: FaqBrowserBlock,
  contactDetails: ContactDetailsBlock,
  enquiryForm: EnquiryFormBlock,
  map: MapBlock,
  newsletter: NewsletterBlock,
};

export function RenderSections({ sections, ctx }: { sections: { id: string; type: string; data: Record<string, unknown> }[]; ctx: Omit<BlockCtx, 'firstIsH1'> & { pageTitle: string } }) {
  const firstIsHero = sections[0]?.type === 'hero';
  return (
    <>
      {!firstIsHero && <h1 className="sr-only">{ctx.pageTitle}</h1>}
      {!firstIsHero && ctx.pageSlug !== '' && <HomeLink variant="bar" />}
      {sections.map((s, i) => {
        const Cmp = BLOCKS[s.type] as ComponentType<BlockProps> | undefined;
        if (!Cmp) return null;
        const el = <Cmp data={s.data || {}} ctx={{ ...ctx, firstIsH1: i === 0 && firstIsHero }} />;
        const showOn = (s.data as { showOn?: string })?.showOn;
        if (showOn === 'tab1' || showOn === 'tab2') {
          return (
            <div key={s.id} data-tab-only={showOn === 'tab1' ? '0' : '1'}>
              {el}
            </div>
          );
        }
        return <Fragment key={s.id}>{el}</Fragment>;
      })}
    </>
  );
}

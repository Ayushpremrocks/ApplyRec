import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Analytics.module.css';
import Button from '../components/Button';
import { SkeletonBlock } from '../components/Skeleton';
import { BarList, ChartCard, ColumnChart, DataTable, StatTile } from '../components/charts/Charts';
import { useAnalyticsQuery } from '../hooks/useApplications';
import { formatWeek } from '../utils/date';

const pct = (v) => (v === null || v === undefined ? '—' : `${Number.isInteger(v) ? v : v.toFixed(1)}%`);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function AnalyticsSkeleton() {
  return (
    <div className={styles.page} role="status" aria-label="Loading analytics">
      <div className={styles.tiles}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={styles.skeletonTile}>
            <SkeletonBlock width="60%" height={12} />
            <SkeletonBlock width="40%" height={30} />
          </div>
        ))}
      </div>
      <div className={styles.charts}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={styles.skeletonTile}>
            <SkeletonBlock width="40%" height={16} />
            <SkeletonBlock height={160} radius={10} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Analytics() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAnalyticsQuery();

  if (isLoading) return <AnalyticsSkeleton />;

  if (isError) {
    return (
      <div className={styles.state} role="alert">
        <h1>Couldn't load analytics</h1>
        <p>{error?.message}</p>
        <Button onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Retrying…' : 'Try again'}
        </Button>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className={styles.state}>
        <h1>No data yet</h1>
        <p>Analytics appear once you've added a few applications.</p>
        <Link to="/dashboard" className={styles.link}>
          Go to applications →
        </Link>
      </div>
    );
  }

  const funnelItems = data.funnel.map((f) => ({ label: f.stage, value: f.count, percent: f.percent }));
  const statusItems = Object.entries(data.by_status).map(([label, value]) => ({ label, value }));
  const sourceItems = data.by_source.map((s) => ({ label: s.label, value: s.interview_rate ?? 0, seg: s }));
  const tagItems = data.by_tag.map((s) => ({ label: `#${s.label}`, value: s.total, seg: s }));
  const weeklyTotal = data.weekly.reduce((sum, w) => sum + w.count, 0);

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.subtitle}>
          Across all {plural(data.total, 'application')}
          {data.archived > 0 && `, including ${data.archived} archived`}.
        </p>
      </div>

      <div className={styles.tiles}>
        <StatTile label="Applications" value={data.total} hint={`${data.active} active`} />
        <StatTile label="Response rate" value={pct(data.response_rate)} hint="Heard back (any status change)" />
        <StatTile label="Interview rate" value={pct(data.interview_rate)} hint="Reached an interview" />
        <StatTile label="Offer rate" value={pct(data.offer_rate)} hint="Received an offer" />
        <StatTile
          label="Avg. time to response"
          value={data.avg_days_to_response === null ? '—' : `${data.avg_days_to_response}d`}
          hint="From applying to first update"
        />
        <StatTile label="Upcoming interviews" value={data.upcoming_interviews} hint="Scheduled from now on" />
      </div>

      <div className={styles.charts}>
        <ChartCard
          className={styles.wide}
          title="Applications per week"
          subtitle={`Last 12 weeks · ${plural(weeklyTotal, 'application')}`}
          table={<DataTable columns={['Week of', 'Applications']} rows={data.weekly.map((w) => [formatWeek(w.week_start), w.count])} />}
        >
          <ColumnChart
            data={data.weekly.map((w) => ({ ...w, value: w.count }))}
            labelFor={(d) => formatWeek(d.week_start)}
            tooltipFor={(d) => `Week of ${formatWeek(d.week_start)}: ${plural(d.count, 'application')}`}
            ariaLabel={`Applications per week for the last 12 weeks, ${weeklyTotal} in total`}
          />
        </ChartCard>

        <ChartCard
          title="Pipeline"
          subtitle="How many applications reached each stage"
          table={
            <DataTable
              columns={['Stage', 'Applications', '% of total']}
              rows={funnelItems.map((f) => [f.label, f.value, pct(f.percent)])}
            />
          }
        >
          <BarList items={funnelItems} max={data.total} detail={(i) => pct(i.percent)} />
        </ChartCard>

        <ChartCard
          title="Current status"
          subtitle="Where every application stands today"
          table={<DataTable columns={['Status', 'Applications']} rows={statusItems.map((s) => [s.label, s.value])} />}
        >
          <BarList items={statusItems} />
        </ChartCard>

        <ChartCard
          title="Interview rate by source"
          subtitle="Do referrals and on-campus openings convert better?"
          table={
            <DataTable
              columns={['Source', 'Applications', 'Interviews', 'Offers', 'Interview rate']}
              rows={data.by_source.map((s) => [s.label, s.total, s.interviews, s.offers, pct(s.interview_rate)])}
            />
          }
        >
          {sourceItems.length ? (
            <BarList items={sourceItems} max={100} format={pct} detail={(i) => plural(i.seg.total, 'app')} />
          ) : (
            <p className={styles.muted}>Set "on-campus / off-campus" on your applications to see this.</p>
          )}
        </ChartCard>

        <ChartCard
          title="Top tags"
          subtitle="Most-used tags and how they convert"
          table={
            data.by_tag.length ? (
              <DataTable
                columns={['Tag', 'Applications', 'Interviews', 'Offers', 'Interview rate']}
                rows={data.by_tag.map((s) => [`#${s.label}`, s.total, s.interviews, s.offers, pct(s.interview_rate)])}
              />
            ) : null
          }
        >
          {tagItems.length ? (
            <BarList items={tagItems} detail={(i) => `${pct(i.seg.interview_rate)} interview`} />
          ) : (
            <p className={styles.muted}>Add tags like "remote" or "dream company" to compare groups.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default Analytics;

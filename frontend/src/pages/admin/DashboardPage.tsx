import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { api } from '../../lib/api';
import type { EventRound, Registration } from '../../lib/types';
import { availableYears, dailyTrend, monthlyTrend, yearlyTrend } from '../../lib/charts';
import { dataAsOfLabel } from '../../lib/format';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { LineChart } from '../../components/charts/LineChart';
import { BarChart } from '../../components/charts/BarChart';
import { DonutChart } from '../../components/charts/DonutChart';

type Granularity = 'day' | 'month' | 'year';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function DashboardPage() {
  const { t, lang } = useLanguage();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [rounds, setRounds] = useState<EventRound[]>([]);
  const [roundFilter, setRoundFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [monthlyYear, setMonthlyYear] = useState('');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [dateFrom, setDateFrom] = useState(daysAgoISO(6));
  const [dateTo, setDateTo] = useState(todayISO());

  useEffect(() => {
    api.getRegistrations()
      .then((data) => {
        setRegs(data);
        const years = availableYears(data);
        setMonthlyYear(years[years.length - 1]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    api.getRounds().then(setRounds).catch(() => {});
  }, []);

  const filteredRegs = useMemo(
    () => (roundFilter === 'all' ? regs : regs.filter((r) => r.roundId === roundFilter)),
    [regs, roundFilter]
  );

  const total = filteredRegs.length;
  const pending = filteredRegs.filter((r) => r.status === 'pending').length;
  const approved = filteredRegs.filter((r) => r.status === 'approved').length;
  const rejected = filteredRegs.filter((r) => r.status === 'rejected').length;
  const revenue = filteredRegs.filter((r) => r.status === 'approved').reduce((a, r) => a + r.amount, 0);

  const years = useMemo(() => availableYears(filteredRegs), [filteredRegs]);
  useEffect(() => {
    if (years.length && !years.includes(monthlyYear)) setMonthlyYear(years[years.length - 1]);
  }, [years]);
  const monthlyPoints = useMemo(() => monthlyTrend(filteredRegs, monthlyYear, lang), [filteredRegs, monthlyYear, lang]);
  const trendBars = useMemo(() => {
    if (granularity === 'day') return dailyTrend(filteredRegs, dateFrom, dateTo);
    if (granularity === 'year') return yearlyTrend(filteredRegs);
    return monthlyTrend(filteredRegs, monthlyYear, lang);
  }, [granularity, filteredRegs, dateFrom, dateTo, monthlyYear, lang]);

  const byRoundBars = useMemo(
    () => rounds.map((r) => ({ label: r.name, value: regs.filter((x) => x.roundId === r.id).length })),
    [rounds, regs]
  );

  const statCards = [
    { label: t('statTotal'), value: String(total) },
    { label: t('statPending'), value: String(pending) },
    { label: t('statApproved'), value: String(approved) },
    { label: t('statRejected'), value: String(rejected) },
    { label: t('statRevenue'), value: revenue.toLocaleString() },
  ];

  if (loading) return <p className="text-muted">{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{t('tabDashboard')}</h2>
        {rounds.length > 0 && (
          <select className="input" style={{ width: 'auto' }} value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)}>
            <option value="all">{t('filterAllRounds')}</option>
            {rounds.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
        {statCards.map((sc) => (
          <div key={sc.label} className="blueprint card" style={{ gap: 4 }}>
            <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
            <div className="card-kicker">{sc.label}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>{sc.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
        <div className="card" style={{ gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div className="card-title">{t('monthlyTrendTitle')}</div>
            <select
              className="input"
              style={{ width: 'auto', minHeight: 'auto', padding: '4px 8px', fontSize: 12 }}
              value={monthlyYear}
              onChange={(e) => setMonthlyYear(e.target.value)}
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="text-muted" style={{ fontSize: 11 }}>{dataAsOfLabel(lang)}</div>
          <LineChart points={monthlyPoints} />
        </div>

        <div className="card" style={{ gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
            <div className="card-title">{t('trendTitle')}</div>
            <SegmentedControl
              options={[
                { key: 'day' as Granularity, label: t('filterDay') },
                { key: 'month' as Granularity, label: t('filterMonth') },
                { key: 'year' as Granularity, label: t('filterYear') },
              ]}
              value={granularity}
              onChange={setGranularity}
            />
          </div>
          <div className="text-muted" style={{ fontSize: 11 }}>{dataAsOfLabel(lang)}</div>
          {granularity === 'day' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
              <input className="input" style={{ width: 'auto', minHeight: 'auto', padding: '4px 8px', fontSize: 12 }} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span className="text-muted" style={{ fontSize: 12 }}>–</span>
              <input className="input" style={{ width: 'auto', minHeight: 'auto', padding: '4px 8px', fontSize: 12 }} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          )}
          <BarChart bars={trendBars} />
        </div>

        <div className="card" style={{ gap: 12, alignItems: 'center' }}>
          <div className="card-title" style={{ alignSelf: 'flex-start' }}>{t('donutTitle')}</div>
          <div className="text-muted" style={{ fontSize: 11, alignSelf: 'flex-start' }}>{dataAsOfLabel(lang)}</div>
          <DonutChart approved={approved} pending={pending} rejected={rejected} total={total} />
        </div>

        {rounds.length > 0 && (
          <div className="card" style={{ gap: 12 }}>
            <div className="card-title">{t('byRoundTitle')}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{dataAsOfLabel(lang)}</div>
            <BarChart bars={byRoundBars} />
          </div>
        )}
      </div>
    </div>
  );
}

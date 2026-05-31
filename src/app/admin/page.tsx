/* ========================================
   CyneMora — Admin Executive Dashboard
   Global Operations Mission Control
   ======================================== */

"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

interface StatItem {
  name: string;
  count: number;
}

interface ActivityItem {
  id: string;
  type: "signup" | "generation";
  timestamp: string;
  username: string;
  email: string;
  description: string;
  status: string;
  ip: string;
}

interface TimelineItem {
  date: string;
  renders: number;
  signups: number;
  generations: number;
}

interface StatsData {
  users: {
    total: number;
    verified: number;
    unverified: number;
    recentSignups: number;
  };
  renders: {
    total: number;
    completed: number;
    failed: number;
    active: number;
    avgTimeSec: number;
  };
  usage: {
    totalGenerations: number;
    totalDurationSec: number;
    modelBreakdown: StatItem[];
  };
  timeline: TimelineItem[];
  recentActivities: ActivityItem[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    // Live-updating clock in the header
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: false }));
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    // Fetch stats
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats");
        if (!response.ok) {
          throw new Error("Failed to load operations stats.");
        }
        const json = await response.json();
        if (json.success) {
          setData(json.stats);
        } else {
          throw new Error(json.error || "Unknown stats load error");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh stats every 30 seconds for live feel
    const statsInterval = setInterval(fetchStats, 30000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(statsInterval);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "var(--space-4)" }}>
        <div style={{ width: "32px", height: "32px", border: "2px solid var(--color-primary-light)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>Synchronizing platform telemetry...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "var(--space-6)", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "var(--radius-lg)", color: "var(--color-error)" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "var(--space-2)" }}>Telemetry Offline</h3>
        <p style={{ fontSize: "var(--text-sm)" }}>{error || "An error occurred while establishing platform connection."}</p>
      </div>
    );
  }

  // Calculate some useful stats
  const totalRenders = data.renders.total;
  const renderSuccessRate = totalRenders > 0 ? Math.round((data.renders.completed / totalRenders) * 100) : 100;
  const totalAirtimeMin = Math.round(data.usage.totalDurationSec / 60);

  // SVG Line Chart Logic
  const chartHeight = 180;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;

  // Max value of timeline metrics to scale properly
  const maxMetricVal = Math.max(
    ...data.timeline.map((d) => Math.max(d.renders, d.signups, d.generations, 5))
  );

  const getPoints = (key: "renders" | "signups" | "generations") => {
    return data.timeline.map((day, index) => {
      const x = paddingX + (index * (chartWidth - paddingX * 2)) / 6;
      const y = chartHeight - paddingY - (day[key] * (chartHeight - paddingY * 2)) / maxMetricVal;
      return `${x},${y}`;
    }).join(" ");
  };

  // Color mapping for donut/models list
  const getModelColor = (index: number) => {
    const colors = ["#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#f87171"];
    return colors[index % colors.length];
  };

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Executive Command Center</h1>
          <p className={styles.pageSubtitle}>Real-time system health, active AI models, and user activity telemetry.</p>
        </div>
        <div className={styles.headerMeta}>
          <span style={{ color: "var(--color-text-tertiary)" }}>SYSTEM TIME: {currentTime}</span>
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            <span>LIVE MONITORS</span>
          </div>
        </div>
      </header>

      {/* Primary KPI Grid */}
      <section className={styles.metricsGrid}>
        {/* Total Users */}
        <div className={`${styles.metricCard} ${styles.metricCardPurple}`}>
          <div className={styles.metricIcon}>👥</div>
          <div className={styles.metricValue}>{data.users.total}</div>
          <div className={styles.metricLabel}>Platform Directors</div>
          <div className={`${styles.metricChange} ${styles.metricChangeUp}`}>
            +{data.users.recentSignups} this week
          </div>
        </div>

        {/* Total Generates */}
        <div className={`${styles.metricCard} ${styles.metricCardBlue}`}>
          <div className={styles.metricIcon}>🎥</div>
          <div className={styles.metricValue}>{data.renders.total}</div>
          <div className={styles.metricLabel}>Render Queue Jobs</div>
          <div className={`${styles.metricChange} ${styles.metricChangeUp}`}>
            {renderSuccessRate}% Success Rate
          </div>
        </div>

        {/* Total Airtime */}
        <div className={`${styles.metricCard} ${styles.metricCardGreen}`}>
          <div className={styles.metricIcon}>⏱️</div>
          <div className={styles.metricValue}>{totalAirtimeMin}m <span style={{ fontSize: "16px", color: "var(--color-text-muted)" }}>{data.usage.totalDurationSec % 60}s</span></div>
          <div className={styles.metricLabel}>Accumulated Video Output</div>
          <div className={`${styles.metricChange} ${styles.metricChangeUp}`}>
            {data.usage.totalGenerations} total scenes
          </div>
        </div>

        {/* Avg Render Performance */}
        <div className={`${styles.metricCard} ${styles.metricCardYellow}`}>
          <div className={styles.metricIcon}>⚡</div>
          <div className={styles.metricValue}>{data.renders.avgTimeSec}s</div>
          <div className={styles.metricLabel}>Avg Render Speed</div>
          <div className={`${styles.metricChange} ${styles.metricChangeUp}`}>
            {data.renders.active} active processes
          </div>
        </div>
      </section>

      {/* Analytics Charts Row */}
      <section className={styles.chartsRow}>
        {/* SVG Activity Line Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Platform Growth & Performance</h3>
              <p className={styles.chartSubtitle}>Telemetry trends of signups, renders, and active generations (7-Day Period)</p>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", fontSize: "11px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", background: "#a78bfa", borderRadius: "50%" }} /> Signups
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", background: "#38bdf8", borderRadius: "50%" }} /> Video Renders
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", background: "#34d399", borderRadius: "50%" }} /> Trial Scenes
              </span>
            </div>
          </div>
          
          <div className={styles.chartBody} style={{ height: `${chartHeight}px` }}>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={styles.chartSvg}>
              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.05)" />
              <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="rgba(255,255,255,0.05)" />
              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="rgba(255,255,255,0.1)" />

              {/* Data Lines */}
              {/* Signups */}
              <polyline fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={getPoints("signups")} />
              {/* Renders */}
              <polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={getPoints("renders")} />
              {/* Trial generations */}
              <polyline fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={getPoints("generations")} />

              {/* Label Markers & Dots */}
              {data.timeline.map((day, idx) => {
                const x = paddingX + (idx * (chartWidth - paddingX * 2)) / 6;
                const renderY = chartHeight - paddingY - (day.renders * (chartHeight - paddingY * 2)) / maxMetricVal;
                return (
                  <g key={idx}>
                    <circle cx={x} cy={renderY} r="3.5" fill="#38bdf8" stroke="#0d0c11" strokeWidth="1" />
                    <text x={x} y={chartHeight - 4} fontSize="9" fill="var(--color-text-muted)" textAnchor="middle">{day.date}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Model Breakdown Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>AI Model Allocation</h3>
              <p className={styles.chartSubtitle}>Distribution of generative models active in operations</p>
            </div>
          </div>

          <div className={styles.chartBody} style={{ minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className={styles.donutWrap}>
              {/* Let's render custom dynamic breakdown list since donut is simple */}
              <div className={styles.donutLegend} style={{ width: "100%" }}>
                {data.usage.modelBreakdown.length === 0 ? (
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>No AI operations recorded yet.</span>
                ) : (
                  data.usage.modelBreakdown.map((item, idx) => {
                    const totalGens = data.usage.totalGenerations || 1;
                    const percent = Math.round((item.count / totalGens) * 100);
                    return (
                      <div key={item.name} className={styles.donutLegendItem} style={{ minWidth: "220px" }}>
                        <span className={styles.donutLegendDot} style={{ background: getModelColor(idx) }} />
                        <span style={{ fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "140px" }} title={item.name}>
                          {item.name.replace("-generate-preview", "").replace("veo-3.1-", "Veo 3.1 ")}
                        </span>
                        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>({item.count})</span>
                          <span className={styles.donutLegendValue}>{percent}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time System Activities Logs */}
      <section className={styles.activityFeed}>
        <div className={styles.chartHeader} style={{ marginBottom: "var(--space-4)" }}>
          <div>
            <h3 className={styles.chartTitle}>System Operations Feed</h3>
            <p className={styles.chartSubtitle}>Live audit log of registrations, authentications, and video render events.</p>
          </div>
          <span className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            <span>REAL-TIME telemetry</span>
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {data.recentActivities.length === 0 ? (
            <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--color-text-muted)" }}>
              Waiting for platform activities to synchronize...
            </div>
          ) : (
            data.recentActivities.map((act) => {
              const isSignup = act.type === "signup";
              const isVerified = act.status === "verified";
              
              let dotBg = "var(--color-primary)";
              if (isSignup) {
                dotBg = isVerified ? "var(--color-success)" : "#f59e0b";
              } else {
                dotBg = "var(--color-accent)";
              }

              return (
                <div key={act.id + act.timestamp} className={styles.activityItem}>
                  <span className={styles.activityDot} style={{ background: dotBg }} />
                  <div className={styles.activityContent}>
                    <div className={styles.activityText}>
                      <strong>{act.username}</strong> ({act.email}) — {act.description}
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span className={styles.activityTime}>
                        {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString()}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}>
                        IP: {act.ip}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className={`${styles.statusBadge} ${isSignup ? (isVerified ? styles.statusOnline : styles.statusPending) : styles.statusTrial}`}>
                      {isSignup ? (isVerified ? "Verified" : "Pending Verify") : "Video Gen"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

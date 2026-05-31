"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import { db } from "@/lib/firebase/client";
import { doc, collection, query, where, onSnapshot } from "firebase/firestore";
import { CreditBalance, CreditTransaction } from "@/lib/types";
import styles from "../dashboard.module.css";

function CreditsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

  const simulatedCheckout = searchParams.get("simulated_checkout");
  const checkoutTier = searchParams.get("tier");
  const checkoutCredits = searchParams.get("credits");

  // Handle Mount & Simulated Checkout Callback (Sandbox mode)
  useEffect(() => {
    if (simulatedCheckout === "success" && checkoutTier && checkoutCredits && user) {
      const provisionSimulated = async () => {
        try {
          const res = await fetch("/api/billing/simulated-provision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tier: checkoutTier,
              credits: Number(checkoutCredits)
            })
          });
          if (res.ok) {
            alert(`🎉 Success! Plan upgraded to ${checkoutTier.toUpperCase()} and added ${checkoutCredits} credits in simulation sandbox!`);
            // Clean URL query parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error("[Simulated Provision] Failed to upgrade credits:", err);
        }
      };
      provisionSimulated();
    }
  }, [simulatedCheckout, checkoutTier, checkoutCredits, user]);

  // Sync balances and transaction logs from Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const balanceUnsubscribe = onSnapshot(doc(db, "creditBalances", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance({ ...data, lastUpdated: data.lastUpdated?.toDate() } as CreditBalance);
      } else {
        setBalance({ userId: user.uid, total: 0, used: 0, remaining: 0, tier: "standard", lastUpdated: new Date() } as CreditBalance);
      }
    });

    const txQuery = query(
      collection(db, "creditTransactions"),
      where("userId", "==", user.uid)
    );
    const txUnsubscribe = onSnapshot(txQuery, (snapshot) => {
      const data: CreditTransaction[] = [];
      snapshot.forEach((d) => data.push({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() } as CreditTransaction));
      setTransactions(data.sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeB - timeA;
      }));
      setLoading(false);
    }, (err) => {
      console.warn("Error fetching transactions", err);
      setLoading(false);
    });

    return () => {
      balanceUnsubscribe();
      txUnsubscribe();
    };
  }, [user]);

  const handleUpgrade = async (tier: "standard" | "premium") => {
    try {
      setLoadingCheckout(tier);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier })
      });

      if (!res.ok) throw new Error("Failed to initialize checkout session.");
      const json = await res.json();
      if (json.success && json.url) {
        // Redirect browser to checkout URL
        window.location.href = json.url;
      } else {
        throw new Error(json.error || "Setup session error");
      }
    } catch (err: any) {
      alert(`Upgrade Error: ${err.message}`);
    } finally {
      setLoadingCheckout(null);
    }
  };

  if (loading) {
    return <div className="animate-fade-in" style={{ padding: 'var(--space-8)' }}>Loading credit usage...</div>;
  }

  const usagePercent = balance && balance.total > 0 ? (balance.used / balance.total) * 100 : 0;

  return (
    <div className="animate-fade-in">
      <header className={styles.dashHeader}>
        <h1 className={styles.dashGreeting}>Credits & Usage</h1>
        <p className={styles.dashSubtitle}>Manage your premium render balance, billing, and tier status.</p>
      </header>

      {/* Credit Balance Grid */}
      <div className={styles.statsRow} style={{ marginBottom: 'var(--space-8)' }}>
        <div className="glass-card" style={{ padding: 'var(--space-6)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10%', top: '-10%', width: '150px', height: '150px', background: 'var(--color-primary-glow)', filter: 'blur(50px)', borderRadius: 'var(--radius-full)', pointerEvents: 'none' }}></div>
          <div className={styles.statIcon} style={{ position: 'relative' }}>💎</div>
          <div className={styles.statValue} style={{ position: 'relative', background: 'linear-gradient(135deg, #fff, var(--color-primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {balance?.remaining.toLocaleString() || '0'}
          </div>
          <div className={styles.statLabel} style={{ position: 'relative' }}>Available Credits</div>
          <div style={{ marginTop: 'var(--space-5)', position: 'relative' }}>
            <button className="btn btn-primary" onClick={() => handleUpgrade("standard")} disabled={loadingCheckout !== null} style={{ width: '100%' }}>
              {loadingCheckout ? "Loading..." : "Top Up Balance"}
            </button>
          </div>
        </div>
        
        <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
          <div className={styles.statIcon}>🔥</div>
          <div className={styles.statValue}>{balance?.used.toLocaleString() || '0'}</div>
          <div className={styles.statLabel}>Used This Period</div>
          <div style={{ marginTop: 'var(--space-6)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                <span>Usage</span>
                <span>{usagePercent.toFixed(1)}%</span>
             </div>
             <div style={{ height: '6px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${usagePercent}%`, background: 'linear-gradient(90deg, var(--color-warm), var(--color-error))' }} />
             </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
          <div className={styles.statIcon}>⭐</div>
          <div className={styles.statValue} style={{ textTransform: 'capitalize' }}>{balance?.tier || 'Standard'}</div>
          <div className={styles.statLabel}>Current Plan Tier</div>
          <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-3)', background: 'var(--color-surface-1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
              Upgrade to Standard or Premium below for reduced render cost rates.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Feed */}
      <div className="glass-card" style={{ padding: 'var(--space-8)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Recent Transactions</h3>
        {transactions.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyDesc}>No recent transactions found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                  <th style={{ padding: 'var(--space-3) 0', fontWeight: 500 }}>Date</th>
                  <th style={{ padding: 'var(--space-3) 0', fontWeight: 500 }}>Description</th>
                  <th style={{ padding: 'var(--space-3) 0', fontWeight: 500 }}>Amount</th>
                  <th style={{ padding: 'var(--space-3) 0', fontWeight: 500 }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: 'var(--text-sm)', transition: 'background var(--duration-fast)', cursor: 'default' }} className="hover:bg-surface-2">
                    <td style={{ padding: 'var(--space-4) 0', color: 'var(--color-text-secondary)' }}>{tx.createdAt?.toLocaleDateString()}</td>
                    <td style={{ padding: 'var(--space-4) 0', color: 'var(--color-text-primary)' }}>{tx.description}</td>
                    <td style={{ padding: 'var(--space-4) 0', fontWeight: 600, color: tx.type === 'credit' ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                    </td>
                    <td style={{ padding: 'var(--space-4) 0', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{tx.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade Plan Tiers Selector Panel */}
      <div className="glass-card" style={{ padding: 'var(--space-8)', marginTop: 'var(--space-6)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Upgrade Production Tiers</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
          Unlock premium credits, priority rendering loops, persistence visual DNA pipelines, and high-fidelity 4K exports.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {/* Standard Plan Upgrade Card */}
          <div style={{ padding: 'var(--space-6)', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge badge-accent" style={{ marginBottom: 'var(--space-3)' }}>Standard Plan</span>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text-primary)' }}>Standard Tier</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)', marginBottom: 'var(--space-4)' }}>
                TBD Price Point (Configurable price structure standard credit allotments)
              </p>
              <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-6)' }}>
                <li>💎 <strong>500 Monthly Credits</strong> included</li>
                <li>⚡ Standard rendering queues</li>
                <li>🎥 baselineVeo optimizations active</li>
                <li>🎞️ standard sequences assemblies</li>
              </ul>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => handleUpgrade("standard")}
              disabled={loadingCheckout !== null || balance?.tier === "standard" || balance?.tier === "premium"}
              style={{ width: '100%' }}
            >
              {loadingCheckout === "standard" ? "Redirecting..." : balance?.tier === "standard" ? "Current Plan Active" : balance?.tier === "premium" ? "Standard Inactive" : "Upgrade Standard"}
            </button>
          </div>

          {/* Premium Plan Upgrade Card */}
          <div style={{ padding: 'var(--space-6)', background: 'rgba(167, 139, 250, 0.03)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-light)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-10%', top: '-10%', width: '100px', height: '100px', background: 'var(--color-primary-glow)', filter: 'blur(45px)', borderRadius: '50%', pointerEvents: 'none' }}></div>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: 'var(--space-3)' }}>★ Premium Plan</span>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text-primary)' }}>Premium Tier</h4>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)', marginBottom: 'var(--space-4)' }}>
                TBD Price Point (Configurable price structure premium credit allotments)
              </p>
              <ul style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', paddingLeft: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-6)' }}>
                <li>💎 <strong>2,000 Monthly Credits</strong> included</li>
                <li>🚀 Hyper-priority rendering queues</li>
                <li>🧪 persistence visual DNA persistence pipelines</li>
                <li>🎞️ sequence chaining (long-form outputs)</li>
                <li>🎬 4K cinematic premium exports</li>
              </ul>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleUpgrade("premium")}
              disabled={loadingCheckout !== null || balance?.tier === "premium"}
              style={{ width: '100%' }}
            >
              {loadingCheckout === "premium" ? "Redirecting..." : balance?.tier === "premium" ? "Premium Active" : "Upgrade Premium"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreditsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 'var(--space-8)' }}>Loading credit workspace...</div>}>
      <CreditsPageContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/auth-context";
import { db } from "@/lib/firebase/client";
import { doc, collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { CreditBalance, CreditTransaction } from "@/lib/types";
import styles from "../dashboard.module.css";

export default function CreditsPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

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

      <div className={styles.statsRow} style={{ marginBottom: 'var(--space-8)' }}>
        <div className="glass-card" style={{ padding: 'var(--space-6)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10%', top: '-10%', width: '150px', height: '150px', background: 'var(--color-primary-glow)', filter: 'blur(50px)', borderRadius: 'var(--radius-full)', pointerEvents: 'none' }}></div>
          <div className={styles.statIcon} style={{ position: 'relative' }}>💎</div>
          <div className={styles.statValue} style={{ position: 'relative', background: 'linear-gradient(135deg, #fff, var(--color-primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {balance?.remaining.toLocaleString() || '0'}
          </div>
          <div className={styles.statLabel} style={{ position: 'relative' }}>Available Credits</div>
          <div style={{ marginTop: 'var(--space-5)', position: 'relative' }}>
            <button className="btn btn-primary" style={{ width: '100%' }}>Top Up Balance</button>
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
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>Upgrade for reduced render costs</p>
          </div>
        </div>
      </div>

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
    </div>
  );
}

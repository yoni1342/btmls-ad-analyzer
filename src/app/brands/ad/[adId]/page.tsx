'use client';

import { useRouter, useParams } from 'next/navigation';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import SidebarLayout from '@/app/components/SidebarLayout';
import CommentTable from '@/app/components/report/CommentTable';
import { Ad, Comment, CommentCluster } from '@/lib/supabase-service';

export default function AdDetailPage() {
  const router = useRouter();
  const params = useParams();
  const adId = params.adId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [ad, setAd] = useState<Ad | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [clusters, setClusters] = useState<CommentCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Comment table filters for this page
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [clusterFilter, setClusterFilter] = useState('');
  const [angleTypeFilter, setAngleTypeFilter] = useState('');

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth?mode=login');
      } else {
        setSession(data.session);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession) => {
      if (!newSession) {
        router.replace('/auth?mode=login');
      } else {
        setSession(newSession);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Data fetch
  useEffect(() => {
    if (!session || !adId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/brands/ad/${adId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch ad details');
        }
        const data = await response.json();
        setAd(data.ad);
        // Comments now come with Angel Type and meta_cluster from the database function
        setComments(data.comments);
        setClusters(data.clusters);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [adId, session]);

  if (!session) {
    return null;
  }

  return (
    <SidebarLayout>
      <div className="container mx-auto py-8 px-4">
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {ad && (
          <>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg mb-6">
              <h1 className="text-3xl font-bold mb-4">{ad.ad_title}</h1>
              <p className="mb-4">{ad.ad_text}</p>
              <div className="flex flex-wrap justify-center gap-4">
                {ad.image && (
                  <div className="flex-1 min-w-[300px] max-w-md">
                    <img
                      src={ad.image}
                      alt="Ad creative"
                      className="rounded-lg w-full h-auto object-contain max-h-96"
                    />
                  </div>
                )}
                {ad.video_url && (
                  <div className="flex-1 min-w-[300px] max-w-md">
                    <video
                      src={ad.video_url}
                      controls
                      className="rounded-lg w-full h-auto object-contain max-h-96"
                    />
                  </div>
                )}
              </div>
              {ad.post_link && (
                <a
                  href={ad.post_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline mt-4 inline-block"
                >
                  View Post
                </a>
              )}
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Comments</h2>
              <CommentTable
                comments={comments}
                clusters={clusters}
                ads={ad ? [ad] : []}
                sentimentFilter={sentimentFilter}
                setSentimentFilter={setSentimentFilter}
                clusterFilter={clusterFilter}
                setClusterFilter={setClusterFilter}
                angleTypeFilter={angleTypeFilter}
                setAngleTypeFilter={setAngleTypeFilter}
              />
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
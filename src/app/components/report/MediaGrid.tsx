'use client';

import { useState } from 'react';

interface Ad {
  ad_id: string;
  ad_title?: string;
  ad_text?: string;
  image_url?: string;
  video_url?: string;
  post_link?: string;
}

type MediaGridProps = {
  ads: Ad[];
};

export default function MediaGrid({ ads }: MediaGridProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'images' | 'videos'>('all');
  
  // Filter ads by media type
  const adsWithImages = ads.filter(ad => ad.image_url);
  const adsWithVideos = ads.filter(ad => ad.video_url);
  
  // Determine which ads to display based on active tab
  let displayAds = ads;
  if (activeTab === 'images') {
    displayAds = adsWithImages;
  } else if (activeTab === 'videos') {
    displayAds = adsWithVideos;
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All Media
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'images'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Images Only
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'videos'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Videos Only
          </button>
        </div>
      </div>
      
      {displayAds.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No media content found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayAds.map(ad => (
            <div key={ad.ad_id} className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden shadow">
              {ad.image_url && (
                <div 
                  className="h-48 bg-cover bg-center cursor-pointer relative" 
                  style={{ backgroundImage: `url(${ad.image_url})` }}
                  onClick={() => ad.image_url && setLightboxImage(ad.image_url)}
                >
                  <div className="absolute inset-0 bg-black opacity-0 hover:opacity-20 transition-opacity" />
                </div>
              )}
              {ad.video_url && (
                <div 
                  className="h-48 bg-gray-200 dark:bg-gray-600 flex items-center justify-center cursor-pointer relative"
                  onClick={() => ad.video_url && setVideoModalUrl(ad.video_url)}
                >
                  <div className="absolute inset-0 bg-black opacity-0 hover:opacity-20 transition-opacity" />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 dark:text-white">{ad.ad_title || ad.ad_id}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                  {ad.ad_text?.substring(0, 100)}
                  {ad.ad_text && ad.ad_text.length > 100 ? '...' : ''}
                </p>
                <div className="mt-2 flex">
                  {ad.post_link && (
                    <a 
                      href={ad.post_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 text-sm"
                    >
                      View Original Post
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img 
              src={lightboxImage} 
              alt="Enlarged view" 
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button 
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75"
              onClick={() => setLightboxImage(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {videoModalUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVideoModalUrl(null);
          }}
        >
          <div className="max-w-4xl w-full aspect-video relative bg-black">
            <iframe
              src={videoModalUrl}
              className="w-full h-full"
              allowFullScreen
              title="Video player"
            ></iframe>
            <button 
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75"
              onClick={() => setVideoModalUrl(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
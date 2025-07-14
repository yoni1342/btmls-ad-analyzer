'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
     <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 animate-fadeIn">
       <div className="container mx-auto px-4 py-12 text-center max-w-6xl">
         <img src="/logo.png" alt="Ad Analyzer Logo" className="mx-auto mb-6 w-20 h-20" />
         <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 text-primary dark:text-primary-light leading-tight">
           Turn Ads & Comments into Actionable Insights
         </h1>
         <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
           Our AI-powered platform analyzes ads and their comments to provide you with sentiment analysis, trend tracking, and deep insights to optimize your campaigns.
         </p>
         <Link
           href="/auth?mode=signup"
           className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl shadow-xl transform hover:-translate-y-2 transition-all duration-300 text-xl border-2 border-blue-600 hover:border-blue-700 hover:shadow-2xl"
           style={{ color: 'white' }}
         >
           Get Started
         </Link>
       </div>

       <div className="bg-white dark:bg-gray-800 py-16">
         <div className="container mx-auto px-4 max-w-6xl">
           <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-primary dark:text-primary-light">Key Features</h2>
           <div className="grid md:grid-cols-3 gap-8 text-center">
             <div className="feature p-6 rounded-xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-white dark:bg-slate-800">
               <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-light text-primary-dark mx-auto mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-smile"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
               </div>
               <h3 className="text-xl md:text-2xl font-bold mb-3 text-primary-dark dark:text-primary-light">Sentiment Analysis</h3>
               <p className="text-gray-600 dark:text-gray-300">Understand the emotional tone behind comments to gauge audience reaction.</p>
             </div>
             <div className="feature p-6 rounded-xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-white dark:bg-slate-800">
               <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-light text-primary-dark mx-auto mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
               </div>
               <h3 className="text-xl md:text-2xl font-bold mb-3 text-primary-dark dark:text-primary-light">Trend Tracking</h3>
               <p className="text-gray-600 dark:text-gray-300">Identify emerging trends and topics of conversation within your ad comments.</p>
             </div>
             <div className="feature p-6 rounded-xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-white dark:bg-slate-800">
               <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary-light text-primary-dark mx-auto mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
               </div>
               <h3 className="text-xl md:text-2xl font-bold mb-3 text-primary-dark dark:text-primary-light">Deep Insights</h3>
               <p className="text-gray-600 dark:text-gray-300">Gain a deeper understanding of your audience and ad performance.</p>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
}

#!/usr/bin/env node

/**
 * Migration script to move reports from file system to Supabase
 * 
 * Usage: 
 * 1. Set up your Supabase environment variables
 * 2. Run: node scripts/migrate-to-supabase.js
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables. Please add them to .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Path to the reports directory
const REPORTS_DIR = path.join(process.cwd(), 'data', 'reports');

async function migrate() {
  console.log('Starting migration of reports to Supabase...');
  
  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    console.log('No reports directory found. Nothing to migrate.');
    return;
  }
  
  // Read the index file
  const indexPath = path.join(REPORTS_DIR, 'index.json');
  if (!fs.existsSync(indexPath)) {
    console.log('No index.json file found. Nothing to migrate.');
    return;
  }
  
  // Parse the index file
  const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const { reports } = indexData;
  
  if (!reports || reports.length === 0) {
    console.log('No reports found in index. Nothing to migrate.');
    return;
  }
  
  console.log(`Found ${reports.length} reports to migrate.`);
  
  // Migrate each report
  for (const reportMetadata of reports) {
    const { id } = reportMetadata;
    const reportPath = path.join(REPORTS_DIR, `${id}.json`);
    
    if (!fs.existsSync(reportPath)) {
      console.log(`Warning: Report file for ${id} not found. Skipping.`);
      continue;
    }
    
    try {
      // Read report data
      const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      // Insert report metadata
      const { error: metadataError } = await supabase
        .from('report_metadata')
        .insert({
          ...reportMetadata,
          // Ensure adcount is lowercase to match PostgreSQL column naming convention
          adcount: reportMetadata.adCount,
        });
      
      if (metadataError) {
        console.error(`Error inserting metadata for report ${id}:`, metadataError);
        continue;
      }
      
      // Insert report data
      const { error: dataError } = await supabase
        .from('reports')
        .insert({
          id,
          data: reportData
        });
      
      if (dataError) {
        console.error(`Error inserting data for report ${id}:`, dataError);
        continue;
      }
      
      console.log(`Successfully migrated report ${id}`);
    } catch (error) {
      console.error(`Error migrating report ${id}:`, error);
    }
  }
  
  console.log('Migration completed!');
}

// Run the migration
migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 
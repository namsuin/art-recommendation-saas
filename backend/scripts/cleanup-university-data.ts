// Script to remove all Korean university data from the database
import { supabase } from '../services/supabase';

async function cleanupUniversityData() {
  logger.info('🧹 Starting cleanup of Korean university data...');
  
  if (!supabase) {
    logger.info('❌ Supabase not configured - cannot clean database');
    return;
  }

  try {
    // 1. Remove artworks with .ac.kr URLs
    const { data: acKrArtworks, error: selectError } = await supabase
      .from('artworks')
      .select('id, title, source_url')
      .like('source_url', '%.ac.kr%');

    if (selectError) {
      logger.error('❌ Error selecting .ac.kr artworks:', selectError);
      return;
    }

    if (acKrArtworks && acKrArtworks.length > 0) {
      logger.info(`🎓 Found ${acKrArtworks.length} artworks with .ac.kr URLs:`, 
        acKrArtworks.map(a => ({ title: a.title, url: a.source_url })));

      const { error: deleteError } = await supabase
        .from('artworks')
        .delete()
        .like('source_url', '%.ac.kr%');

      if (deleteError) {
        logger.error('❌ Error deleting .ac.kr artworks:', deleteError);
      } else {
        logger.info(`✅ Successfully deleted ${acKrArtworks.length} .ac.kr artworks`);
      }
    } else {
      logger.info('✅ No .ac.kr artworks found in database');
    }

    // 2. Remove artworks with university platforms
    const { data: universityPlatforms, error: selectError2 } = await supabase
      .from('artworks')
      .select('id, title, platform')
      .eq('platform', 'university');

    if (selectError2) {
      logger.error('❌ Error selecting university platform artworks:', selectError2);
      return;
    }

    if (universityPlatforms && universityPlatforms.length > 0) {
      logger.info(`🎓 Found ${universityPlatforms.length} artworks with university platform`);

      const { error: deleteError2 } = await supabase
        .from('artworks')
        .delete()
        .eq('platform', 'university');

      if (deleteError2) {
        logger.error('❌ Error deleting university platform artworks:', deleteError2);
      } else {
        logger.info(`✅ Successfully deleted ${universityPlatforms.length} university platform artworks`);
      }
    } else {
      logger.info('✅ No university platform artworks found in database');
    }

    // 3. Remove artworks with graduation sources
    const { data: graduationSources, error: selectError3 } = await supabase
      .from('artworks')
      .select('id, title, source')
      .like('source', '%졸업%');

    if (selectError3) {
      logger.error('❌ Error selecting graduation source artworks:', selectError3);
      return;
    }

    if (graduationSources && graduationSources.length > 0) {
      logger.info(`🎓 Found ${graduationSources.length} artworks with graduation sources`);

      const { error: deleteError3 } = await supabase
        .from('artworks')
        .delete()
        .like('source', '%졸업%');

      if (deleteError3) {
        logger.error('❌ Error deleting graduation source artworks:', deleteError3);
      } else {
        logger.info(`✅ Successfully deleted ${graduationSources.length} graduation source artworks`);
      }
    } else {
      logger.info('✅ No graduation source artworks found in database');
    }

    logger.info('🎉 University data cleanup complete!');

  } catch (error) {
    logger.error('❌ Cleanup error:', error);
  }
}

// Run cleanup if this script is executed directly
if (import.meta.main) {
  cleanupUniversityData();
}

export { cleanupUniversityData };
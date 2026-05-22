import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runTests() {
  console.log('🚀 Starting Supabase connection test...\n');

  try {
    // Test 1: List tables
    console.log('📋 Test 1: Checking if tables exist...');
    const { data: tables, error: tableError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.error('❌ Tables do not exist yet. Run the SQL scripts first.');
      console.error('Error:', tableError.message);
      process.exit(1);
    }

    if (tableError) {
      throw tableError;
    }

    console.log('✅ Tables exist\n');

    // Test 2: Create a test project
    console.log('📝 Test 2: Creating test project...');
    const testUserId = 'test-user-' + Date.now();
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([
        {
          user_id: testUserId,
          name: 'Test Project',
          description: 'This is a test project',
        },
      ])
      .select()
      .single();

    if (projectError) {
      throw projectError;
    }

    console.log('✅ Project created:', {
      id: project.id,
      user_id: project.user_id,
      name: project.name,
    });
    console.log();

    // Test 3: Create a test cluster
    console.log('📦 Test 3: Creating test cluster...');
    const { data: cluster, error: clusterError } = await supabase
      .from('clusters')
      .insert([
        {
          project_id: project.id,
          title: 'What is Photosynthesis?',
        },
      ])
      .select()
      .single();

    if (clusterError) {
      throw clusterError;
    }

    console.log('✅ Cluster created:', {
      id: cluster.id,
      title: cluster.title,
      project_id: cluster.project_id,
    });
    console.log();

    // Test 4: Create a test topic
    console.log('🏷️  Test 4: Creating test topic...');
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .insert([
        {
          cluster_id: cluster.id,
          title: 'Photosynthesis',
          explanation: 'Photosynthesis is the process by which plants convert light into chemical energy.',
          eli5: 'Plants eat sunlight and turn it into food.',
          fact: 'Plants produce about 28% of the oxygen we breathe.',
          images: [
            { url: 'https://example.com/photosynthesis1.jpg', alt: 'Leaf cells' },
            { url: 'https://example.com/photosynthesis2.jpg', alt: 'Chloroplast' },
          ],
          videos: [
            { url: 'https://youtube.com/watch?v=xxxxx', title: 'How Photosynthesis Works' },
          ],
          study_notes: 'Remember: light reactions happen in thylakoids, dark reactions in stroma.',
        },
      ])
      .select()
      .single();

    if (topicError) {
      throw topicError;
    }

    console.log('✅ Topic created:', {
      id: topic.id,
      title: topic.title,
      cluster_id: topic.cluster_id,
    });
    console.log();

    // Test 5: Verify you can read back the data
    console.log('🔍 Test 5: Reading back data...');
    const { data: readProjects, error: readError } = await supabase
      .from('projects')
      .select('*, clusters(*, topics(*))')
      .eq('id', project.id);

    if (readError) {
      throw readError;
    }

    console.log('✅ Full hierarchy retrieved:');
    console.log(JSON.stringify(readProjects, null, 2));
    console.log();

    // Test 6: Clean up
    console.log('🧹 Test 6: Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);

    if (deleteError) {
      throw deleteError;
    }

    console.log('✅ Test data cleaned up\n');

    console.log('🎉 ALL TESTS PASSED! Supabase is set up correctly.\n');
    console.log('Next steps:');
    console.log('1. Go to Supabase dashboard → SQL Editor');
    console.log('2. Run the RLS policy SQL script (Step 4 from blueprint)');
    console.log('3. Then we can start Phase 3 (React migration)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

runTests();

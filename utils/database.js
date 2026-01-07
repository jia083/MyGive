/**
 * Supabase Database Utility
 *
 * This utility handles all database operations for user profiles, chat messages, and campaign data.
 * Replaces localStorage for production deployment.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
let supabase = null;

function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not configured. Falling back to localStorage.');
      return null;
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// ============================================================================
// USER PROFILES
// ============================================================================

/**
 * Save user profile to database
 * @param {string} walletAddress - User's wallet address
 * @param {Object} profileData - Profile data (name, email, phone, location, bio)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function saveUserProfile(walletAddress, profileData) {
  const client = getSupabaseClient();

  // Always save to localStorage as a cache/backup
  saveUserProfileToLocalStorage(walletAddress, profileData);

  // If Supabase not configured, we're done (localStorage is already saved)
  if (!client) {
    console.log('Supabase not configured, profile saved to localStorage only');
    return { success: true, data: profileData };
  }

  try {
    const { data, error } = await client
      .from('user_profiles')
      .upsert({
        wallet_address: walletAddress.toLowerCase(),
        name: profileData.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        bio: profileData.bio || '',
        profile_image: profileData.profileImage || '',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet_address'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error, but localStorage backup exists:', error);
      // Return success since localStorage save worked
      return { success: true, data: profileData };
    }

    console.log('Profile saved to Supabase successfully');
    return { success: true, data };
  } catch (error) {
    console.error('Error saving user profile to Supabase:', error);
    // Return success since localStorage save worked
    return { success: true, data: profileData };
  }
}

/**
 * Get user profile from database
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getUserProfile(walletAddress) {
  const client = getSupabaseClient();

  // First check localStorage cache for immediate response
  const localResult = getUserProfileFromLocalStorage(walletAddress);

  // If Supabase not configured, return localStorage data
  if (!client) {
    return localResult;
  }

  try {
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found in Supabase, return localStorage data if available
        return localResult.data ? localResult : { success: true, data: null };
      }
      // On other errors, fall back to localStorage
      console.error('Supabase error, falling back to localStorage:', error);
      return localResult;
    }

    // Update localStorage cache with Supabase data
    if (data) {
      saveUserProfileToLocalStorage(walletAddress, data);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Fall back to localStorage on error
    return localResult;
  }
}

/**
 * Get multiple user profiles by wallet addresses
 * @param {string[]} walletAddresses - Array of wallet addresses
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getUserProfiles(walletAddresses) {
  const client = getSupabaseClient();

  // Fallback to localStorage if Supabase not configured
  if (!client) {
    return getUserProfilesFromLocalStorage(walletAddresses);
  }

  try {
    const lowerAddresses = walletAddresses.map(addr => addr.toLowerCase());

    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .in('wallet_address', lowerAddresses);

    if (error) throw error;

    // Convert array to object keyed by wallet address
    const profileMap = {};
    data.forEach(profile => {
      profileMap[profile.wallet_address] = profile;
    });

    return { success: true, data: profileMap };
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CHAT MESSAGES
// ============================================================================

/**
 * Save chat message to database
 * @param {number} resourceId - Resource ID
 * @param {string} claimId - Claim ID/timestamp
 * @param {string} sender - Sender's wallet address
 * @param {string} message - Message content
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function saveChatMessage(resourceId, claimId, sender, message) {
  const client = getSupabaseClient();

  // Fallback to localStorage if Supabase not configured
  if (!client) {
    return saveChatMessageToLocalStorage(resourceId, claimId, sender, message);
  }

  try {
    const { data, error } = await client
      .from('chat_messages')
      .insert({
        resource_id: resourceId,
        claim_id: claimId,
        sender: sender.toLowerCase(),
        message: message,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error saving chat message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get chat messages for a resource claim
 * @param {number} resourceId - Resource ID
 * @param {string} claimId - Claim ID/timestamp
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getChatMessages(resourceId, claimId) {
  const client = getSupabaseClient();

  // Fallback to localStorage if Supabase not configured
  if (!client) {
    return getChatMessagesFromLocalStorage(resourceId, claimId);
  }

  try {
    const { data, error } = await client
      .from('chat_messages')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('claim_id', claimId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CAMPAIGN CATEGORIES
// ============================================================================

/**
 * Save campaign category
 * @param {number} campaignId - Campaign ID
 * @param {string} category - Category name
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function saveCampaignCategory(campaignId, category) {
  const client = getSupabaseClient();

  // Fallback to localStorage if Supabase not configured
  if (!client) {
    return saveCampaignCategoryToLocalStorage(campaignId, category);
  }

  try {
    const { data, error } = await client
      .from('campaign_categories')
      .upsert({
        campaign_id: campaignId,
        category: category,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'campaign_id'
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error saving campaign category:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get campaign category
 * @param {number} campaignId - Campaign ID
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
export async function getCampaignCategory(campaignId) {
  const client = getSupabaseClient();

  // Fallback to localStorage if Supabase not configured
  if (!client) {
    return getCampaignCategoryFromLocalStorage(campaignId);
  }

  try {
    const { data, error } = await client
      .from('campaign_categories')
      .select('category')
      .eq('campaign_id', campaignId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No category found
        return { success: true, data: null };
      }
      throw error;
    }

    return { success: true, data: data.category };
  } catch (error) {
    console.error('Error fetching campaign category:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get multiple campaign categories
 * @param {number[]} campaignIds - Array of campaign IDs
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function getCampaignCategories(campaignIds) {
  const client = getSupabaseClient();

  // Fallback to localStorage if Supabase not configured
  if (!client) {
    return getCampaignCategoriesFromLocalStorage(campaignIds);
  }

  try {
    const { data, error } = await client
      .from('campaign_categories')
      .select('*')
      .in('campaign_id', campaignIds);

    if (error) throw error;

    // Convert array to object keyed by campaign ID
    const categoryMap = {};
    data.forEach(item => {
      categoryMap[item.campaign_id] = item.category;
    });

    return { success: true, data: categoryMap };
  } catch (error) {
    console.error('Error fetching campaign categories:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// LOCALSTORAGE FALLBACK FUNCTIONS
// ============================================================================

function saveUserProfileToLocalStorage(walletAddress, profileData) {
  try {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
    registeredUsers[walletAddress.toLowerCase()] = {
      ...profileData,
      walletAddress: walletAddress.toLowerCase(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
    return { success: true, data: registeredUsers[walletAddress.toLowerCase()] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getUserProfileFromLocalStorage(walletAddress) {
  try {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
    const profile = registeredUsers[walletAddress.toLowerCase()] || null;
    return { success: true, data: profile };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getUserProfilesFromLocalStorage(walletAddresses) {
  try {
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
    const profiles = {};
    walletAddresses.forEach(addr => {
      const lowerAddr = addr.toLowerCase();
      if (registeredUsers[lowerAddr]) {
        profiles[lowerAddr] = registeredUsers[lowerAddr];
      }
    });
    return { success: true, data: profiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function saveChatMessageToLocalStorage(resourceId, claimId, sender, message) {
  try {
    const chatKey = `${resourceId}_${claimId}`;
    const allChats = JSON.parse(localStorage.getItem('resourceChats') || '{}');

    if (!allChats[chatKey]) {
      allChats[chatKey] = [];
    }

    const newMessage = {
      sender: sender.toLowerCase(),
      message: message,
      created_at: new Date().toISOString()
    };

    allChats[chatKey].push(newMessage);
    localStorage.setItem('resourceChats', JSON.stringify(allChats));

    return { success: true, data: newMessage };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getChatMessagesFromLocalStorage(resourceId, claimId) {
  try {
    const chatKey = `${resourceId}_${claimId}`;
    const allChats = JSON.parse(localStorage.getItem('resourceChats') || '{}');
    const messages = allChats[chatKey] || [];
    return { success: true, data: messages };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function saveCampaignCategoryToLocalStorage(campaignId, category) {
  try {
    const categories = JSON.parse(localStorage.getItem('campaignCategories') || '{}');
    categories[campaignId] = category;
    localStorage.setItem('campaignCategories', JSON.stringify(categories));
    return { success: true, data: { campaign_id: campaignId, category } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getCampaignCategoryFromLocalStorage(campaignId) {
  try {
    const categories = JSON.parse(localStorage.getItem('campaignCategories') || '{}');
    return { success: true, data: categories[campaignId] || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getCampaignCategoriesFromLocalStorage(campaignIds) {
  try {
    const allCategories = JSON.parse(localStorage.getItem('campaignCategories') || '{}');
    const categories = {};
    campaignIds.forEach(id => {
      if (allCategories[id]) {
        categories[id] = allCategories[id];
      }
    });
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

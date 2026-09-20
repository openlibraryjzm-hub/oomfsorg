import { supabase } from './supabase';
import { SphereItem } from '../types/map';

const DEFAULT_GENESIS_SPHERE: SphereItem = {
  id: 'sphere-genesis',
  name: 'Genesis OOMFS Globe',
  ownerName: 'Genesis Network',
  description: 'Primary network sphere for value-weighted community territory allocation and validator node governance.',
  mappingMode: 'conquest',
  userCount: 6,
  gridResolution: 512,
  theme: 'neon',
  seed: 42,
  createdAt: 'Sep 1, 2026',
};

export async function fetchSpheresFromSupabase(): Promise<SphereItem[]> {
  try {
    const { data, error } = await supabase
      .from('spheres')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error, falling back to local dataset:', error.message);
      return [DEFAULT_GENESIS_SPHERE];
    }

    if (!data || data.length === 0) {
      // Auto seed default genesis sphere if DB is empty
      await saveSphereToSupabase(DEFAULT_GENESIS_SPHERE);
      return [DEFAULT_GENESIS_SPHERE];
    }

    return data.map((row: any) => ({
      id: row.id.toString(),
      name: row.name,
      ownerName: row.owner_name,
      description: row.description || '',
      mappingMode: row.mapping_mode,
      userCount: row.user_count,
      gridResolution: row.grid_resolution,
      theme: row.theme,
      seed: row.seed,
      createdAt: new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      customUserShares: row.custom_user_shares || undefined,
      customUserImages: row.custom_user_images || {},
    }));
  } catch (err) {
    console.error('Error loading spheres from Supabase:', err);
    return [DEFAULT_GENESIS_SPHERE];
  }
}

export async function saveSphereToSupabase(sphere: SphereItem): Promise<SphereItem | null> {
  try {
    const { data, error } = await supabase
      .from('spheres')
      .insert([
        {
          name: sphere.name,
          owner_name: sphere.ownerName,
          description: sphere.description,
          mapping_mode: sphere.mappingMode,
          user_count: sphere.userCount,
          grid_resolution: sphere.gridResolution,
          theme: sphere.theme,
          seed: sphere.seed,
          custom_user_shares: sphere.customUserShares || [],
          custom_user_images: sphere.customUserImages || {},
        },
      ])
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to insert sphere into Supabase:', error?.message);
      return null;
    }

    return {
      id: data.id.toString(),
      name: data.name,
      ownerName: data.owner_name,
      description: data.description || '',
      mappingMode: data.mapping_mode,
      userCount: data.user_count,
      gridResolution: data.grid_resolution,
      theme: data.theme,
      seed: data.seed,
      createdAt: new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      customUserShares: data.custom_user_shares || undefined,
      customUserImages: data.custom_user_images || {},
    };
  } catch (err) {
    console.error('Error saving sphere:', err);
    return null;
  }
}

export async function updateSphereInSupabase(
  sphereId: string,
  updates: Partial<SphereItem>
): Promise<boolean> {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.ownerName !== undefined) payload.owner_name = updates.ownerName;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.mappingMode !== undefined) payload.mapping_mode = updates.mappingMode;
    if (updates.userCount !== undefined) payload.user_count = updates.userCount;
    if (updates.gridResolution !== undefined) payload.grid_resolution = updates.gridResolution;
    if (updates.theme !== undefined) payload.theme = updates.theme;
    if (updates.seed !== undefined) payload.seed = updates.seed;
    if (updates.customUserShares !== undefined) payload.custom_user_shares = updates.customUserShares;
    if (updates.customUserImages !== undefined) payload.custom_user_images = updates.customUserImages;

    const { error } = await supabase
      .from('spheres')
      .update(payload)
      .eq('id', sphereId);

    if (error) {
      console.error('Failed to update sphere in Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error updating sphere:', err);
    return false;
  }
}

export async function uploadTileImageToSupabase(file: File): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `tile-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('sphere-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Failed to upload image to Supabase storage:', uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from('sphere-images').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading tile image:', err);
    return null;
  }
}

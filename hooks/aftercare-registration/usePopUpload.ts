/** Pop (Proof of Payment) upload handlers for aftercare registration */
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { assertSupabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { ensureImageLibraryPermission } from '@/lib/utils/mediaLibrary';
import type { ShowAlert } from '../useAftercareRegistration.helpers';

function inferImageExtAndMime(uri: string): { ext: 'jpg' | 'png' | 'webp'; mime: string } {
  const clean = (uri || '').split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return { ext: 'png', mime: 'image/png' };
  if (clean.endsWith('.webp')) return { ext: 'webp', mime: 'image/webp' };
  return { ext: 'jpg', mime: 'image/jpeg' };
}

export function usePopUpload(showAlert: ShowAlert) {
  const [proofOfPayment, setProofOfPayment] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [pendingPopUri, setPendingPopUri] = useState<string | null>(null);

  const handlePopUpload = useCallback(async () => {
    try {
      const hasPermission = await ensureImageLibraryPermission();
      if (!hasPermission) {
        showAlert({ title: 'Permission Required', message: 'Please allow access to your photos to upload proof of payment.' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setPendingPopUri(result.assets[0].uri);
    } catch (error: any) {
      showAlert({ title: 'Upload Failed', message: error?.message || 'Failed to upload proof of payment. Please try again.' });
    } finally {
      setUploadingProof(false);
    }
  }, [showAlert]);

  const confirmPopUpload = useCallback(async (uri: string) => {
    setUploadingProof(true);
    try {
      const supabase = assertSupabase();
      const normalizedUri =
        uri.startsWith('file://') || uri.startsWith('content://') ? uri : `file://${uri}`;
      const { ext, mime } = inferImageExtAndMime(uri);
      const fileName = `aftercare_pop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const authUserId = sessionData.session?.user?.id;
      if (!accessToken) throw new Error('Session expired. Please sign in again and retry.');
      if (!authUserId) throw new Error('Could not determine your account ID for upload.');

      const storagePath = `${authUserId}/aftercare/${fileName}`;

      const uploadEndpoint = `${supabaseUrl}/storage/v1/object/proof-of-payments/${storagePath}`;
      const uploadResponse = await FileSystem.uploadAsync(uploadEndpoint, normalizedUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: supabaseAnonKey,
          'content-type': mime,
          'x-upsert': 'false',
        },
      });

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        const bodyPreview = (uploadResponse.body || '').slice(0, 220);
        throw new Error(`Failed to upload proof of payment (status ${uploadResponse.status})${bodyPreview ? `: ${bodyPreview}` : ''}.`);
      }

      const { data: urlData } = supabase
        .storage.from('proof-of-payments')
        .getPublicUrl(storagePath);
      setProofOfPayment(urlData.publicUrl);
      showAlert({ title: 'Success', message: 'Proof of payment uploaded successfully!' });
    } catch (error: any) {
      showAlert({ title: 'Upload Failed', message: error?.message || 'Failed to upload proof of payment.' });
    } finally {
      setUploadingProof(false);
    }
    setPendingPopUri(null);
  }, [showAlert]);

  const cancelPopUpload = useCallback(() => setPendingPopUri(null), []);

  return {
    proofOfPayment, setProofOfPayment,
    uploadingProof, pendingPopUri,
    handlePopUpload, confirmPopUpload, cancelPopUpload,
  };
}

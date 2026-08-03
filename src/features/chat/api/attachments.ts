import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

import { readAuthSession } from '@/shared/auth';

import type { AttachmentSource } from '../components/AttachmentMenu';
import type { ChatAttachment } from '../store/chatStore';
import type { PickedAttachment } from './conversationApi';

export async function pickAttachment(source: AttachmentSource): Promise<PickedAttachment | null> {
  if (source === 'files') {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset) return null;
    return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/octet-stream' };
  }

  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera permission is required to take a photo.');
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Photo permission is required to choose an image.');
  }

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  const extension = asset.mimeType?.split('/')[1] ?? 'jpg';
  return {
    uri: asset.uri,
    name: asset.fileName ?? `image-${Date.now()}.${extension}`,
    mimeType: asset.mimeType ?? 'image/jpeg',
  };
}

export async function openAttachment(attachment: ChatAttachment): Promise<void> {
  if (!attachment.uri) throw new Error('This attachment is not available on the server.');
  const session = await readAuthSession();
  if (!session) throw new Error('Please sign in again.');
  const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const destination = `${FileSystem.cacheDirectory}${attachment.id}-${safeName}`;
  await FileSystem.downloadAsync(attachment.uri, destination, {
    headers: { Authorization: `${session.tokenType} ${session.accessToken}` },
  });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Opening files is not supported on this device.');
  await Sharing.shareAsync(destination, { mimeType: attachment.mimeType });
}

export async function attachmentAuthHeaders(): Promise<Record<string, string>> {
  const session = await readAuthSession();
  return session ? { Authorization: `${session.tokenType} ${session.accessToken}` } : {};
}

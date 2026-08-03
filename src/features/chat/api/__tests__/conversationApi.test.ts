import { apiRequest } from '@/shared/api/client';

import { deleteConversation, uploadConversationAttachment } from '../conversationApi';

jest.mock('@/shared/api/client', () => ({ apiRequest: jest.fn(), apiUrl: jest.fn((path) => `http://api${path}`) }));

const apiRequestMock = jest.mocked(apiRequest);

beforeEach(() => {
  apiRequestMock.mockReset();
  apiRequestMock.mockResolvedValue(undefined);
});

it('uploads a picked file as authenticated multipart data and stores the returned attachment', async () => {
  apiRequestMock.mockResolvedValueOnce({
    attachment: {
      id: 'attachment-1',
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: 42,
      createdAt: '2026-08-03T10:00:00.000Z',
    },
  });

  await uploadConversationAttachment('chat-1', {
    uri: 'file:///photo.jpg',
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
  });

  expect(apiRequestMock).toHaveBeenCalledWith('/conversations/chat-1/attachments', expect.objectContaining({
    method: 'POST',
    authenticated: true,
    body: expect.any(FormData),
  }));
});

it('sends delete as a concrete JSON request so Android does not leave it open', async () => {
  await deleteConversation('chat/id with spaces');

  expect(apiRequestMock).toHaveBeenCalledWith('/conversations/chat%2Fid%20with%20spaces', {
    method: 'DELETE',
    authenticated: true,
    body: '{}',
  });
});

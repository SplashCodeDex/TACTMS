import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import {
//   FAVORITES_DRIVE_FILENAME,
//   TRANSACTION_LOG_DRIVE_FILENAME,
// } from "../constants"; // TODO: Use these constants when implementing Google Drive sync.

declare global {
  interface Window {
    gapi: any;
  }
}

const findOrCreateDriveFile = async (fileName: string) => {
  const res = await window.gapi.client.drive.files.list({
    q: `name='${fileName}' and trashed=false`,
    spaces: "drive",
    fields: "files(id, name)",
  });
  if (res.result.files.length > 0) return res.result.files[0].id;
  const createRes = await window.gapi.client.drive.files.create({
    resource: { name: fileName, mimeType: "application/json" },
    fields: "id",
  });
  await saveToDrive(createRes.result.id, []);
  return createRes.result.id;
};

const readFromDrive = async <T>(fileId: string): Promise<T[]> => {
  try {
    const res = await window.gapi.client.drive.files.get({
      fileId,
      alt: "media",
    });
    return res.body ? JSON.parse(res.body) : [];
  } catch (e) {
    return [];
  }
};

const saveToDrive = (fileId: string, data: any[]) => {
  const metadata = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const form = new FormData();
  form.append("metadata", new Blob([], { type: "application/json" }));
  form.append("file", metadata);
  return window.gapi.client.request({
    path: `/upload/drive/v3/files/${fileId}`,
    method: "PATCH",
    params: { uploadType: "multipart" },
    body: form,
  });
};

export const useFindOrCreateDriveFile = (
  fileName: string,
  isLoggedIn: boolean,
) => {
  return useQuery({
    queryKey: ["driveFile", fileName],
    queryFn: () => findOrCreateDriveFile(fileName),
    enabled: isLoggedIn && !!window.gapi?.client?.drive,
  });
};

export const useReadFromDrive = <T>(
  fileId: string | null,
  isLoggedIn: boolean,
) => {
  return useQuery({
    queryKey: ["driveFileContent", fileId],
    queryFn: () => readFromDrive<T>(fileId!),
    enabled: isLoggedIn && !!fileId && !!window.gapi?.client?.drive,
  });
};

export const useSaveToDrive = (fileId: string | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any[]) => saveToDrive(fileId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driveFileContent", fileId] });
    },
  });
};

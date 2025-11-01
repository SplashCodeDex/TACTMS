import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const findOrCreateDriveFile = async (fileName: string) => {
  const sanitizedFileName = fileName.replace(/'/g, "\\'");
  const res = await window.gapi.client.drive.files.list({
    q: `name='${sanitizedFileName}' and trashed=false`,
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
    if (res.body) {
      const data = JSON.parse(res.body);
      return Array.isArray(data) ? data : [];
    }
    return [];
  } catch (e) {
    console.error("readFromDrive: Error reading or parsing file", e);
    throw e; // Re-throw the error
  }
};

const saveToDrive = (fileId: string, data: any[]) => {
  const content = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify({})], { type: "application/json" }),
  );
  form.append("file", content);
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
    mutationFn: async (data: any[]) => {
      if (!fileId) {
        throw new Error("Cannot save to Drive: fileId is null.");
      }
      await saveToDrive(fileId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driveFileContent", fileId] });
    },
  });
};

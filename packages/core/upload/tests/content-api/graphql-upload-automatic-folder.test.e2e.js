'use strict';

const fs = require('fs');
const path = require('path');

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;

let rqAdmin;
let uploadFolder;

describe('Uploads folder (GraphQL)', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    // delete all folders
    const res = await rq({
      method: 'GET',
      url: '/upload/folders?pagination[pageSize]=100',
    });
    await rqAdmin({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: {
        folderIds: res.body.results.map(f => f.id),
      },
    });

    await strapi.destroy();
  });

  describe('uploadFile', () => {
    test('Uploaded file goes into a specific folder', async () => {
      const formData = {
        operations: JSON.stringify({
          query: /* GraphQL */ `
            mutation uploadFile($file: Upload!) {
              upload(file: $file) {
                data {
                  id
                }
              }
            }
          `,
        }),
        map: JSON.stringify({ nFile1: ['variables.file'] }),
        nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      };

      const res = await rq({ method: 'POST', url: '/graphql', formData });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body.data.upload.data.id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      const formData = {
        operations: JSON.stringify({
          query: /* GraphQL */ `
            mutation uploadFile($file: Upload!) {
              upload(file: $file) {
                data {
                  id
                }
              }
            }
          `,
        }),
        map: JSON.stringify({ nFile1: ['variables.file'] }),
        nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      };

      const res = await rq({ method: 'POST', url: '/graphql', formData });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body.data.upload.data.id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });
      expect(file.folder.uid).not.toBe(uploadFolder.uid);

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted (handle duplicates)', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      await rqAdmin({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'Uploads',
          parent: null,
        },
      });

      const formData = {
        operations: JSON.stringify({
          query: /* GraphQL */ `
            mutation uploadFile($file: Upload!) {
              upload(file: $file) {
                data {
                  id
                }
              }
            }
          `,
        }),
        map: JSON.stringify({ nFile1: ['variables.file'] }),
        nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      };

      const res = await rq({ method: 'POST', url: '/graphql', formData });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body.data.upload.data.id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (1)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });
      expect(file.folder.uid).not.toBe(uploadFolder.uid);

      uploadFolder = file.folder;
    });
  });

  describe('multipleUploadFile', () => {
    test('Uploaded file goes into a specific folder', async () => {
      const formData = {
        operations: JSON.stringify({
          query: /* GraphQL */ `
            mutation multipleUploadFile($files: [Upload]!) {
              multipleUpload(files: $files) {
                data {
                  id
                }
              }
            }
          `,
        }),
        map: JSON.stringify({ nFile1: ['variables.files'] }),
        nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      };

      const res = await rq({ method: 'POST', url: '/graphql', formData });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body.data.multipleUpload[0].data.id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (1)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      const formData = {
        operations: JSON.stringify({
          query: /* GraphQL */ `
            mutation multipleUploadFile($files: [Upload]!) {
              multipleUpload(files: $files) {
                data {
                  id
                }
              }
            }
          `,
        }),
        map: JSON.stringify({ nFile1: ['variables.files'] }),
        nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      };

      const res = await rq({ method: 'POST', url: '/graphql', formData });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body.data.multipleUpload[0].data.id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (1)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });
      expect(file.folder.uid).not.toBe(uploadFolder.uid);

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted (handle duplicates)', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      await rqAdmin({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'Uploads (1)',
          parent: null,
        },
      });

      const formData = {
        operations: JSON.stringify({
          query: /* GraphQL */ `
            mutation multipleUploadFile($files: [Upload]!) {
              multipleUpload(files: $files) {
                data {
                  id
                }
              }
            }
          `,
        }),
        map: JSON.stringify({ nFile1: ['variables.files'] }),
        nFile1: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      };

      const res = await rq({ method: 'POST', url: '/graphql', formData });

      expect(res.statusCode).toBe(200);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body.data.multipleUpload[0].data.id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'Uploads (2)',
          uid: expect.anything(),
        },
        folderPath: `/${file.folder.uid}`,
      });
      expect(file.folder.uid).not.toBe(uploadFolder.uid);

      uploadFolder = file.folder;
    });
  });
});

const path = require('path');
const { buildSchema } = require('payload/config');

module.exports = buildSchema({
  name: 'video-engine',
  collections: [
    {
      slug: 'videos',
      admin: {
        useAsTitle: 'title',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'file',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'thumbnail',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'duration',
          type: 'text',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { value: 'processing', label: 'Processing' },
            { value: 'ready', label: 'Ready' },
            { value: 'error', label: 'Error' },
          ],
          defaultValue: 'processing',
        },
        {
          name: 'createdAt',
          type: 'date',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'updatedAt',
          type: 'date',
          admin: {
            readOnly: true,
          },
        },
      ],
    },
  ],
  types: [],
});
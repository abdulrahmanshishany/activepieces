import { createAction, MarkdownVariant, Property } from '@activepieces/pieces-framework';
import { linearAuth } from '../../..';
import { props } from '../../common/props';
import { makeClient } from '../../common/client';

export const linearUpdateProject = createAction({
  auth: linearAuth,
  name: 'linear_update_project',
  classification: 'WRITE',
  displayName: 'Update Project',
  description: 'Changes the fields you fill in on an existing project.',
  audience: 'both',
  aiMetadata: {
    description: 'Updates an existing Linear project identified by its project ID, changing fields such as name, description, icon, color, start/target dates, or status. Use to modify a project already created. Repeating the same update is idempotent.',
    idempotent: true,
  },
  propertyGroups: [
    {
      key: 'target',
      display: 'section',
      label: 'Project to update',
      icon: 'file',
      props: ['team_id', 'project_id'],
    },
    {
      key: 'changes',
      display: 'section',
      label: 'Changes',
      icon: 'text',
      props: ['hint', 'name', 'description', 'state'],
    },
    {
      key: 'timeline',
      display: 'section',
      label: 'Timeline',
      icon: 'calendar',
      props: ['startDate', 'targetDate'],
    },
  ],
  props: {
    team_id: {
      ...props.team_id(),
      description: 'The team the project belongs to.',
    },
    project_id: props.project_id(),
    hint: Property.MarkDown({
      value: 'Empty fields keep their current value.',
      variant: MarkdownVariant.INFO,
    }),
    name: Property.ShortText({
      displayName: 'Name',
      required: false,
    }),
    description: Property.LongText({
      displayName: 'Description',
      description: 'Short summary shown under the name, up to 255 characters.',
      required: false,
    }),
    state: props.project_status(false),
    startDate: Property.DateTime({
      displayName: 'Start Date',
      placeholder: '2026-10-01',
      required: false,
      width: 'half',
    }),
    targetDate: Property.DateTime({
      displayName: 'Target Date',
      placeholder: '2026-12-15',
      required: false,
      width: 'half',
    }),
    icon: Property.ShortText({
      displayName: 'Icon',
      required: false,
      advanced: true,
    }),
    color: Property.Color({
      displayName: 'Color',
      description: 'Leave empty to keep the current color.',
      required: false,
      advanced: true,
    }),
  },
  async run({ auth, propsValue }) {
    const client = makeClient(auth);
    const input: Record<string, unknown> = {
      name: propsValue.name,
      description: propsValue.description,
      icon: propsValue.icon,
      color: propsValue.color || undefined,
      startDate: propsValue.startDate,
      targetDate: propsValue.targetDate,
    };
    const selectedState = propsValue['state'];
    if (selectedState != null && selectedState !== '') {
      const statuses = await client.listProjectStatuses();
      const match = statuses.find(
        (s: { type: string }) => s.type === selectedState,
      );
      if (!match) {
        throw new Error(
          `No "${selectedState}" project status exists in this Linear workspace. Available statuses: ${statuses.map((s) => s.name).join(', ')}.`,
        );
      }
      input['statusId'] = match.id;
    }
    const query = `
      mutation UpdateProject($id: String!, $input: ProjectUpdateInput!) {
        projectUpdate(id: $id, input: $input) {
          success
          lastSyncId
          project {
            id
            name
            description
            color
            icon
            state
            startDate
            targetDate
            progress
            url
            createdAt
            updatedAt
          }
        }
      }
    `;
    const result = await client.rawRequest(query, {
      id: propsValue.project_id!,
      input,
    }) as { data: { projectUpdate: { success: boolean; lastSyncId: number; project: unknown } } };
    if (result.data.projectUpdate.success) {
      return {
        success: result.data.projectUpdate.success,
        lastSyncId: result.data.projectUpdate.lastSyncId,
        project: result.data.projectUpdate.project,
      };
    } else {
      throw new Error(`Unexpected error updating project`);
    }
  },
});

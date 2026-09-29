import { createAction, Property } from '@activepieces/pieces-framework';
import { linearAuth } from '../../..';
import { props } from '../../common/props';
import { makeClient } from '../../common/client';

export const linearCreateProject = createAction({
  auth: linearAuth,
  name: 'linear_create_project',
  classification: 'WRITE',
  displayName: 'Create Project',
  description: 'Creates a project in a Linear team.',
  audience: 'both',
  aiMetadata: {
    description: 'Creates a new project under a Linear team, with optional description, icon, color, start/target dates, and status. Use to set up a new project to group issues. Requires a team ID and project name; not idempotent, each call creates a distinct project.',
    idempotent: false,
  },
  propertyGroups: [
    {
      key: 'project',
      display: 'section',
      label: 'Project',
      icon: 'file',
      props: ['team_id', 'name', 'description', 'state'],
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
      description: 'The project is created in this team.',
    },
    name: Property.ShortText({
      displayName: 'Name',
      placeholder: 'Website Redesign',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Description',
      description: 'Short summary shown under the name, up to 255 characters.',
      required: false,
    }),
    state: {
      ...props.project_status(false),
      description: 'Leave empty to use the default status.',
    },
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
      description: 'An emoji shortcode.',
      placeholder: ':rocket:',
      required: false,
      advanced: true,
    }),
    color: Property.Color({
      displayName: 'Color',
      description: "Leave empty for Linear's default color.",
      required: false,
      advanced: true,
    }),
  },
  async run({ auth, propsValue }) {
    const client = makeClient(auth);
    const input: Record<string, unknown> = {
      teamIds: [propsValue.team_id!],
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
      mutation CreateProject($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
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
    const result = await client.rawRequest(query, { input }) as {
      data: { projectCreate: { success: boolean; lastSyncId: number; project: unknown } };
    };
    if (result.data.projectCreate.success) {
      return {
        success: result.data.projectCreate.success,
        lastSyncId: result.data.projectCreate.lastSyncId,
        project: result.data.projectCreate.project,
      };
    } else {
      throw new Error(`Unexpected error creating project`);
    }
  },
});

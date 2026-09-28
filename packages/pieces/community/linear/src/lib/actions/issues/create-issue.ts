import { createAction, Property } from '@activepieces/pieces-framework';
import { linearAuth } from '../../..';
import { props } from '../../common/props';
import { makeClient } from '../../common/client';
import { LinearDocument } from '@linear/sdk';

export const linearCreateIssue = createAction({
  auth: linearAuth,
  name: 'linear_create_issue',
  classification: 'WRITE',
  displayName: 'Create Issue',
  description: 'Creates an issue in a Linear team.',
  audience: 'both',
  aiMetadata: {
    description: 'Creates a new issue in a Linear team, with optional assignee, status, labels, priority, and template. Use to file a task, bug, or work item. Requires a team ID and title; not idempotent, each call creates a distinct issue.',
    idempotent: false,
  },
  props: {
    team_id: {
      ...props.team_id(),
      description: 'The issue is created in this team.',
    },
    title: Property.ShortText({
      displayName: 'Title',
      placeholder: 'Checkout fails on Safari',
      required: true,
    }),
    description: Property.LongText({
      displayName: 'Description',
      description: 'Markdown is supported.',
      required: false,
    }),
    state_id: {
      ...props.status_id(),
      description: "Leave empty to use the team's default.",
    },
    priority_id: props.priority_id(),
    assignee_id: props.assignee_id(),
    labels: props.labels(),
    template_id: { ...props.template_id(), advanced: true },
  },
  async run({ auth, propsValue }) {
    const issue: LinearDocument.IssueCreateInput = {
      teamId: propsValue.team_id!,
      title: propsValue.title,
      description: propsValue.description,
      assigneeId: propsValue.assignee_id,
      stateId: propsValue.state_id,
      priority: propsValue.priority_id,
      labelIds: propsValue.labels?.length ? propsValue.labels : undefined,
      templateId: propsValue.template_id
    };
    const client = makeClient(auth);
    const result = await client.createIssue(issue);
    if (result.success) {
      const createdIssue = await result.issue;
      return {
        success: result.success,
        lastSyncId: result.lastSyncId,
        issue: createdIssue,
      };
    } else {
      throw new Error(`Unexpected error: ${result}`)
    }
  },
});

import { createAction, MarkdownVariant, Property } from '@activepieces/pieces-framework';
import { linearAuth } from '../../..';
import { props } from '../../common/props';
import { makeClient } from '../../common/client';
import { LinearDocument } from '@linear/sdk';

export const linearUpdateIssue = createAction({
  auth: linearAuth,
  name: 'linear_update_issue',
  classification: 'WRITE',
  displayName: 'Update Issue',
  description: 'Changes the fields you fill in on an existing issue.',
  audience: 'both',
  aiMetadata: {
    description: 'Updates an existing Linear issue identified by its issue ID, changing fields such as title, description, assignee, status, labels, or priority. Use to modify an issue already created. Only the provided fields are changed; repeating the same update is idempotent.',
    idempotent: true,
  },
  props: {
    team_id: {
      ...props.team_id(),
      description: 'The team the issue belongs to.',
    },
    issue_id: props.issue_id(),
    hint: Property.MarkDown({
      value: 'Empty fields keep their current value.',
      variant: MarkdownVariant.INFO,
    }),
    title: Property.ShortText({
      displayName: 'Title',
      required: false,
    }),
    description: Property.LongText({
      displayName: 'Description',
      description: 'Markdown is supported.',
      required: false,
    }),
    state_id: props.status_id(),
    priority_id: props.priority_id(),
    assignee_id: props.assignee_id(),
    labels: {
      ...props.labels(),
      description: "Replaces the issue's current labels.",
    },
  },
  async run({ auth, propsValue }) {
    const issueId = propsValue.issue_id!;
    const issue: LinearDocument.IssueUpdateInput = {
      title: propsValue.title,
      description: propsValue.description,
      assigneeId: propsValue.assignee_id,
      stateId: propsValue.state_id,
      priority: propsValue.priority_id,
      labelIds: propsValue.labels?.length ? propsValue.labels : undefined,
    };
    const client = makeClient(auth);
    const result = await client.updateIssue(issueId, issue);
    if (result.success) {
      const updatedIssue = await result.issue;
      return {
        success: result.success,
        lastSyncId: result.lastSyncId,
        issue: updatedIssue,
      };
    } else {
      throw new Error(`Unexpected error: ${result}`)
    }
  },
});

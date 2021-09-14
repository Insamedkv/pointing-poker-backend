import { Issue } from '../models/room';

export const isValidFields = (issueFields: Issue): void => {
  const issueValues = Object.values(issueFields);
  const necessaryFileds = ['issueTitle', 'priority', 'link'];
  necessaryFileds.forEach((key) => {
    if (!(key in issueFields)) throw new Error(`Undefined field ${key}`);
  });
  issueValues.forEach((value) => {
    if (value === undefined) {
      throw new Error('Define title, priority and link fields');
    }
  });
};

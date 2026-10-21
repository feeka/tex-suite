export const validLabel = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9:_.-]{0,79}$/.test(value);
export const validFormula = value => typeof value === 'string' && value.length <= 4000;

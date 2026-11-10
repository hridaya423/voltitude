export const offline = (url) => {
  const [base, hash = ''] = url.split(/(?=#)/);
  return /[?&]api=/.test(base) ? url : `${base}${base.includes('?') ? '&' : '?'}api=${hash}`;
};

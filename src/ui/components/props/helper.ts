export default function props(params) {
  let obj = params[0];

  let arr = [];
  Object.keys(obj).forEach((key) => {
    arr.push({ key, value: obj[key] });
  });
  return arr;
};

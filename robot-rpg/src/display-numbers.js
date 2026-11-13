// Round displayed amounts without changing the underlying combat calculations.
export const wholeNumber=value=>String(Math.round(value));
export const signedWholeNumber=value=>`${value<0?'−':'+'}${wholeNumber(Math.abs(value))}`;

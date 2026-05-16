export function generateUPIQR(amount: number, upiId: string = "lexusfitness@upi") {
  const upiLink = `upi://pay?pa=${upiId}&pn=Lexus%20Fitness%20Group&am=${amount}&cu=INR`;
  return upiLink;
}
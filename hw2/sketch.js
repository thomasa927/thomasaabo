function setup() {
  let name = prompt("Hello, what is your name?");
  alert("Welcome " + name + ", it's a pleasure to greet you!");
  let numInput1 = prompt("Please enter an integer value:");
  let num1 = Number(numInput1);
  let numInput2 = prompt("Please enter a value:");
  let num2 = Number(numInput2);
  alert("Let me show you what I can do with the numbers " + num1 + " and " + num2 + ":");
  alert(num1 + " + " + num2 + " = " + (num1 + num2));
  alert(num1 + " - " + num2 + " = " + (num1 - num2));
  alert(num1 + " * " + num2 + " = " + num1 * num2);
  alert(num1 + " / " + num2 + " = " + num1 / num2);
  alert(num1 + " % " + num2 + " = " + (num1 % num2));
  let maximum;
  if (num1 > num2) { maximum = num1; } else { maximum = num2; }
  alert("The max of " + num1 + " and " + num2 + " is " + maximum);
  let minimum;
  if (num1 < num2) { minimum = num1; } else { minimum = num2; }
  alert("The min of " + num1 + " and " + num2 + " is " + minimum);
  let dec = parseFloat(prompt("Please enter a value with a decimal part:"));
  alert("Let me show you what I can do with the number " + dec + ":");
  alert("The negative of " + dec + " is " + -dec);
  alert("The sine of " + dec + " radians is " + sin(dec));
  alert("The cosine of " + dec + " radians is " + cos(dec));
  alert(dec + "^10 = " + pow(dec, 10));
  alert("Square root of " + dec + " = " + sqrt(dec));
  alert("Rounded " + dec + " = " + round(dec));
  alert("Floor of " + dec + " = " + floor(dec));
  if (dec > 0) {
    alert("Your number is positive VIBEYYYYY");
  } else if (dec < 0) {
    alert("Ooo, a negative number. YOU SHOULD BE MORE POSITIVE!!!");
  } else {
    alert("Zero. SMH THATS NOT A REAL NUMBER");
  }
  if (dec > 10) {
    alert("That's a pretty large number! GET YOURSELF A FOOTLONG TO CELEBRATE");
  } else if (dec < 1 && dec > -1) {
    alert("That's a small number, but small can be powerful");
  } else {
    alert("That's a nice, manageable number. yes.");
  }
}

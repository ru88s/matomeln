const wsse = require('wsse');

// Test different ways to use the wsse package
console.log('Testing wsse package...\n');

// Method 1: Direct function call (like Deno)
try {
  const token1 = wsse({ username: 'testuser', password: 'testpass' });
  console.log('Method 1 - Direct call:');
  console.log('Token object:', typeof token1, Object.keys(token1 || {}));
  if (token1 && token1.getWSSEHeader) {
    console.log('WSSE Header:', token1.getWSSEHeader({ nonceBase64: true }));
  }
} catch (e) {
  console.log('Method 1 failed:', e.message);
}

console.log('\n---\n');

// Method 2: Using UsernameToken
try {
  const token2 = new wsse.UsernameToken({
    username: 'testuser',
    password: 'testpass'
  });
  console.log('Method 2 - UsernameToken:');
  console.log('Token object:', typeof token2, Object.keys(token2 || {}));
  if (token2 && token2.getWSSEHeader) {
    console.log('WSSE Header:', token2.getWSSEHeader({ nonceBase64: true }));
  }
} catch (e) {
  console.log('Method 2 failed:', e.message);
}

console.log('\n---\n');

// Method 3: Check default export
try {
  console.log('Method 3 - Default export:');
  console.log('wsse type:', typeof wsse);
  console.log('wsse keys:', Object.keys(wsse));

  if (typeof wsse === 'function') {
    const token3 = wsse({ username: 'testuser', password: 'testpass' });
    console.log('Token from function:', typeof token3);
    if (token3 && token3.getWSSEHeader) {
      console.log('WSSE Header:', token3.getWSSEHeader({ nonceBase64: true }));
    }
  }
} catch (e) {
  console.log('Method 3 failed:', e.message);
}

console.log('\n---\n');

// Method 4: Check if wsse() returns a constructor
try {
  const WSSEFactory = wsse();
  console.log('Method 4 - Factory:');
  console.log('Factory type:', typeof WSSEFactory);
  console.log('Factory keys:', Object.keys(WSSEFactory || {}));

  if (WSSEFactory && WSSEFactory.UsernameToken) {
    const token4 = new WSSEFactory.UsernameToken({
      username: 'testuser',
      password: 'testpass'
    });
    console.log('Token object:', typeof token4);
    if (token4 && token4.getWSSEHeader) {
      console.log('WSSE Header:', token4.getWSSEHeader({ nonceBase64: true }));
    }
  }
} catch (e) {
  console.log('Method 4 failed:', e.message);
}
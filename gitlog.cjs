const { execSync } = require('child_process');
try {
  const diff = execSync('git log -p -10 src/components/CheckoutView.tsx').toString();
  const fs = require('fs');
  fs.writeFileSync('gitlog.txt', diff);
} catch (e) {
  console.log(e);
}

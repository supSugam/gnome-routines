
filename = '/home/ctrlcat/Repositories/Personal/gnome-routines/src/ui/editor.ts'

with open(filename, 'r') as f:
    lines = f.readlines()

balance = 0
for i, line in enumerate(lines):
    for char in line:
        if char == '{':
            balance += 1
        elif char == '}':
            balance -= 1
            if balance < 0:
                print(f"Negative balance at line {i+1}: {line.strip()}")
                exit(0)

print(f"Final balance: {balance}")

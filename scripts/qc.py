import os, re, json
from collections import Counter

words_dir = 'src/domains/spelling/words'
files = sorted([f for f in os.listdir(words_dir) if re.match(r'tier\d+-pipeline-[a-z]\.ts$', f)])
print(f'Pipeline chunk files found: {len(files)}')
print('Files:', files)
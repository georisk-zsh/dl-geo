"""校验器：按顺序执行 README.md 全部 python 块（共享命名空间），打印各块实际输出。"""
import re, io, sys, contextlib
from pathlib import Path

text = Path('README.md').read_text(encoding='utf-8')
blocks = re.findall(r'```python\n(.*?)```', text, re.S)
ns = {}
for i, code in enumerate(blocks, 1):
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(compile(code, f'block{i}', 'exec'), ns)
        status = 'OK'
    except Exception as e:
        status = f'FAIL {type(e).__name__}: {e}'
    print(f'===== block {i} [{status}] =====')
    print(buf.getvalue(), end='')

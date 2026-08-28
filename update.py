#
# Update stubs across all .html files
#

import fileinput
import os

class Stub:
    name: str
    content: str

    def __init__(self, name):
        self.name = name
        self.content = open(f"./stubs/{self.name}.html", "r").read()
        self.start_marker = f"<!-- BEG: {self.name} -->"
        self.end_marker = f"<!-- FIN: {self.name} -->"
        self.old_marker = "{{"+self.name.upper()+"}}"

stubs = [Stub("head"), Stub("nav"), Stub("end")]

def update_file(filename):
    out_lines = []

    with open(filename, "r") as in_file:
        for line in in_file:
            in_stub = False
            for stub in stubs:
                if stub.start_marker in line:
                    in_stub = True
                    out_lines.append(line)
                    out_lines.append(stub.content)
                    while stub.end_marker not in line:
                        line = next(in_file)
                    out_lines.append(stub.end_marker+"\n")
                    break
                elif stub.old_marker in line:
                    in_stub = True
                    out_lines.append(stub.start_marker+"\n")
                    out_lines.append(stub.content)
                    out_lines.append(stub.end_marker+"\n")
                    break
            if not in_stub:
                out_lines.append(line)

    with open(filename, "w") as out_file:
        for line in out_lines:
            out_file.write(line)


def main():
    for root, dirs, files in os.walk("."):
        for filename in files:
            if filename.endswith(".html"):
                filepath = os.path.join(root, filename)
                print(f"Updating filename: {filepath}")
                update_file(filepath)

main()

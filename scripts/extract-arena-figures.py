import argparse
from pathlib import Path
import pymupdf

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
args = parser.parse_args()
output = Path(__file__).resolve().parents[1] / "public/corpus/arena/figures"
output.mkdir(parents=True, exist_ok=True)

figures = [
    ("mind-the-gap-statement", "01_Mind_the_Gap_Problem.pdf", 1, (105, 135, 465, 310)),
    ("mind-the-gap-solution", "01_Mind_the_Gap_Solution.pdf", 1, (175, 220, 425, 335)),
    ("the-bubble-treaty-statement", "01_The_Bubble_Treaty_Problem.pdf", 1, (135, 280, 470, 380)),
    ("the-bubble-treaty-solution-equal", "01_The_Bubble_Treaty_Solution.pdf", 1, (205, 268, 395, 404)),
    ("the-bubble-treaty-solution-unequal", "01_The_Bubble_Treaty_Solution.pdf", 2, (195, 432, 400, 592)),
    ("the-cosmic-kitchen-statement", "01_The_Cosmic_Kitchen_Problem.pdf", 2, (225, 630, 375, 745)),
    ("the-five-fold-collision-statement", "01_The_Five_Fold_Collision_Problem.pdf", 1, (150, 135, 465, 202)),
    ("the-five-fold-collision-solution", "01_The_Five_Fold_Collision_Solution.pdf", 2, (150, 262, 450, 400)),
    ("the-phantom-charge-statement", "01_The_Phantom_Charge_Problem.pdf", 1, (155, 195, 400, 381)),
    ("the-phantom-charge-solution", "01_The_Phantom_Charge_Solution.pdf", 2, (165, 200, 440, 325)),
    ("the-string-that-answered-back-statement", "01_The_String_That_Answered_Back_Problem.pdf", 1, (130, 205, 465, 305)),
    ("the-string-that-answered-back-solution-a", "01_The_String_That_Answered_Back_Solution.pdf", 1, (135, 540, 450, 655)),
    ("the-string-that-answered-back-solution-b", "01_The_String_That_Answered_Back_Solution.pdf", 2, (135, 312, 450, 428)),
    ("the-clock-in-the-racing-mirror-statement", "02_The_Clock_in_the_Racing_Mirror_Problem.pdf", 1, (145, 150, 470, 247)),
    ("the-clock-in-the-racing-mirror-solution", "02_The_Clock_in_the_Racing_Mirror_Solution.pdf", 2, (155, 145, 455, 248)),
    ("the-dodecahedron-conspiracy-statement", "02_The_Dodecahedron_Conspiracy_Problem.pdf", 1, (185, 140, 375, 300)),
    ("the-dodecahedron-conspiracy-solution", "02_The_Dodecahedron_Conspiracy_Solution.pdf", 1, (230, 145, 365, 275)),
    ("the-quantum-escape-room-statement", "02_The_Quantum_Escape_Room_Problem.pdf", 1, (210, 265, 375, 380)),
    ("the-quantum-escape-room-solution", "02_The_Quantum_Escape_Room_Solution.pdf", 2, (210, 232, 395, 354)),
    ("the-three-way-wave-split-statement", "02_The_Three_Way_Wave_Split_Problem.pdf", 1, (160, 235, 435, 420)),
    ("titans-double-take-statement", "02_Titans_Double_Take_Problem.pdf", 1, (125, 125, 450, 425)),
    ("titans-double-take-solution-primary", "02_Titans_Double_Take_Solution.pdf", 1, (180, 125, 410, 345)),
    ("titans-double-take-solution-secondary", "02_Titans_Double_Take_Solution.pdf", 2, (65, 310, 535, 455)),
    ("a-grin-and-a-wiggle-statement", "03_A_GRIN_and_a_Wiggle_Problem.pdf", 1, (65, 190, 530, 315)),
    ("a-grin-and-a-wiggle-solution-image", "03_A_GRIN_and_a_Wiggle_Solution.pdf", 1, (145, 460, 440, 615)),
    ("a-grin-and-a-wiggle-solution-focus", "03_A_GRIN_and_a_Wiggle_Solution.pdf", 2, (190, 650, 460, 780)),
    ("an-atom-with-stage-fright-solution-population", "03_An_Atom_with_Stage_Fright_Solution.pdf", 2, (135, 355, 490, 525)),
    ("an-atom-with-stage-fright-solution-power", "03_An_Atom_with_Stage_Fright_Solution.pdf", 3, (135, 330, 490, 500)),
    ("the-invisible-brake-statement", "03_The_Invisible_Brake_Problem.pdf", 1, (130, 280, 470, 385)),
    ("the-bending-beam-riddle-statement", "03_The_Bending_Beam_Riddle_Problem.pdf", 1, (80, 220, 510, 310)),
    ("the-capacitors-missing-energy-statement", "03_The_Capacitors_Missing_Energy_Problem.pdf", 1, (200, 175, 410, 310)),
    ("the-infinite-v-statement", "03_The_Infinite_V_Problem.pdf", 1, (125, 150, 420, 333)),
    ("the-infinite-v-solution", "03_The_Infinite_V_Solution.pdf", 1, (185, 120, 440, 255)),
]

for name, filename, number, coordinates in figures:
    with pymupdf.open(args.source / filename) as document:
        page = document[number - 1]
        page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=pymupdf.Rect(coordinates)).save(output / f"{name}.png")
print(f"Extracted {len(figures)} diagram crops; no PDF pages are published.")

for start in range(0, len(figures), 12):
    contact = pymupdf.open()
    page = contact.new_page(width=1600, height=1050)
    for i, (name, *_) in enumerate(figures[start:start + 12]):
        x, y = (i % 4) * 400, (i // 4) * 350
        page.insert_text((x + 8, y + 16), name, fontsize=9)
        page.insert_image(pymupdf.Rect(x + 8, y + 24, x + 392, y + 340), filename=str(output / f"{name}.png"))
    page.get_pixmap().save(f"/tmp/arena-diagrams-verified-{start // 12}.png")

from __future__ import annotations

import json
from pathlib import Path

from graphify.analyze import god_nodes, suggest_questions, surprising_connections
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.export import to_html, to_json
from graphify.extract import extract
from graphify.report import generate as generate_report


ROOT = Path(r"D:\work\web\perler-beads-creator")
TARGET = ROOT / "perler-beads"
OUTPUT_DIR = TARGET / "graphify-out"
CODE_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".go",
    ".rs",
    ".java",
    ".c",
    ".h",
    ".cpp",
    ".cc",
    ".cxx",
    ".hpp",
    ".rb",
    ".cs",
    ".kt",
    ".kts",
    ".scala",
    ".php",
    ".swift",
    ".lua",
    ".toc",
    ".zig",
    ".ps1",
    ".m",
    ".mm",
}
EXCLUDE_PARTS = {
    "node_modules",
    "dist",
    "TEMP",
    "graphify-out",
    "coverage",
    ".git",
    ".vite",
    ".cache",
}


def collect_frontend_code_files(target: Path) -> list[Path]:
    files: list[Path] = []
    for path in target.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix not in CODE_EXTENSIONS:
            continue
        if any(part in EXCLUDE_PARTS for part in path.parts):
            continue
        if any(part.startswith(".") for part in path.parts):
            continue
        files.append(path)
    return sorted(files)


def estimate_words(paths: list[Path]) -> int:
    total = 0
    for path in paths:
        try:
            total += len(path.read_text(encoding="utf-8", errors="ignore").split())
        except Exception:
            continue
    return total


def make_community_labels(graph, communities: dict[int, list[str]]) -> dict[int, str]:
    labels: dict[int, str] = {}
    degrees = dict(graph.degree())
    for cid, nodes in communities.items():
        ranked = sorted(
            nodes,
            key=lambda nid: (
                0 if graph.nodes[nid].get("file_type") == "code" else 1,
                -degrees.get(nid, 0),
                graph.nodes[nid].get("label", nid),
            ),
        )
        top_labels: list[str] = []
        for nid in ranked:
            label = str(graph.nodes[nid].get("label", nid)).strip()
            if not label or label in top_labels:
                continue
            top_labels.append(label)
            if len(top_labels) == 3:
                break
        labels[cid] = " / ".join(top_labels) if top_labels else f"Community {cid}"
    return labels


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("1/7 收集代码文件...", flush=True)
    code_files = collect_frontend_code_files(TARGET)
    print(f"   代码文件: {len(code_files)}", flush=True)
    detection = {
        "total_files": len(code_files),
        "total_words": estimate_words(code_files),
        "needs_graph": True,
    }
    print("2/7 提取结构...", flush=True)
    extraction = extract(code_files)
    print("3/7 构建图谱...", flush=True)
    graph = build_from_json(extraction)
    print("4/7 聚类分析...", flush=True)
    communities = cluster(graph)
    cohesion = score_all(graph, communities)
    community_labels = make_community_labels(graph, communities)
    god_nodes_data = god_nodes(graph)
    surprise_data = surprising_connections(graph, communities)
    question_data = suggest_questions(graph, communities, community_labels)

    print("5/7 写出 JSON/HTML...", flush=True)
    to_json(graph, communities, str(OUTPUT_DIR / "graph.json"))
    to_html(graph, communities, str(OUTPUT_DIR / "graph.html"), community_labels)

    print("6/7 生成报告...", flush=True)
    report_text = generate_report(
        graph,
        communities,
        cohesion,
        community_labels,
        god_nodes_data,
        surprise_data,
        detection,
        {
            "input": extraction.get("input_tokens", 0),
            "output": extraction.get("output_tokens", 0),
        },
        str(TARGET),
        question_data,
    )
    (OUTPUT_DIR / "GRAPH_REPORT.md").write_text(report_text, encoding="utf-8")

    summary = {
        "target": str(TARGET),
        "output_dir": str(OUTPUT_DIR),
        "detected_files": detection["total_files"],
        "detected_words": detection["total_words"],
        "code_files": len(code_files),
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "communities": len(communities),
    }
    (OUTPUT_DIR / "graphify-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("7/7 完成", flush=True)
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()

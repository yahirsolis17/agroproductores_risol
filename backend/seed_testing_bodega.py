from smoke_utils import ensure_smoke_context


def main() -> int:
    context = ensure_smoke_context()
    print(context.to_json())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

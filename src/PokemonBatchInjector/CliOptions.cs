namespace PokemonBatchInjector;

/// <summary>
/// Parsed command-line options for the batch injector.
/// </summary>
public sealed class CliOptions
{
    public required string SavePath { get; init; }
    public required string SetsPath { get; init; }
    public int StartBox { get; init; }
    public string? OutPath { get; init; }
    public bool DryRun { get; init; }

    private const string Usage = """
        Pokémon Batch Injector — generate legal Pokémon from Showdown sets and
        inject them into a save file (PKHeX + Auto Legality Mod backend).

        Usage:
          pkinject --save <path> --sets <path> [--box <int>] [--out <path>] [--dry-run]

        Options:
          --save <path>   Source save file (Scarlet/Violet or Legends Z-A). Required.
          --sets <path>   Text file of Showdown sets, separated by blank lines. Required.
          --box  <int>    Starting box index, 0-based (default: 0).
          --out  <path>   Output save path. Required unless --dry-run.
                          The source save is never overwritten.
          --dry-run       Run parsing + legality checks but write nothing.
          -h, --help      Show this help.
        """;

    /// <summary>
    /// Parses argv. Returns null and prints help/errors to the console on failure.
    /// </summary>
    public static CliOptions? Parse(string[] args)
    {
        if (args.Length == 0 || args.Contains("-h") || args.Contains("--help"))
        {
            Console.WriteLine(Usage);
            return null;
        }

        string? save = null, sets = null, outPath = null;
        int startBox = 0;
        bool dryRun = false;

        for (int i = 0; i < args.Length; i++)
        {
            string arg = args[i];
            switch (arg)
            {
                case "--save":
                    save = RequireValue(args, ref i, arg);
                    break;
                case "--sets":
                    sets = RequireValue(args, ref i, arg);
                    break;
                case "--out":
                    outPath = RequireValue(args, ref i, arg);
                    break;
                case "--box":
                    string boxRaw = RequireValue(args, ref i, arg) ?? "";
                    if (!int.TryParse(boxRaw, out startBox) || startBox < 0)
                        return Fail($"--box must be a non-negative integer (got '{boxRaw}').");
                    break;
                case "--dry-run":
                    dryRun = true;
                    break;
                default:
                    return Fail($"Unknown argument: '{arg}'. Use --help for usage.");
            }
        }

        if (string.IsNullOrWhiteSpace(save))
            return Fail("--save is required.");
        if (string.IsNullOrWhiteSpace(sets))
            return Fail("--sets is required.");
        if (!dryRun && string.IsNullOrWhiteSpace(outPath))
            return Fail("--out is required unless --dry-run is specified.");

        return new CliOptions
        {
            SavePath = save!,
            SetsPath = sets!,
            StartBox = startBox,
            OutPath = outPath,
            DryRun = dryRun,
        };
    }

    private static string? RequireValue(string[] args, ref int i, string flag)
    {
        if (i + 1 >= args.Length)
        {
            Console.Error.WriteLine($"Missing value for {flag}.");
            return null;
        }
        return args[++i];
    }

    private static CliOptions? Fail(string message)
    {
        Console.Error.WriteLine($"error: {message}");
        return null;
    }
}

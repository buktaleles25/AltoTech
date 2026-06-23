using PKHeX.Core;
using PokemonBatchInjector;

return Runner.Run(args);

internal static class Runner
{
    public static int Run(string[] args)
    {
        var opts = CliOptions.Parse(args);
        if (opts is null)
            return 2; // bad/missing args or --help (message already printed)

        try
        {
            return Execute(opts);
        }
        catch (Exception ex)
        {
            Log.Error(ex.Message);
            return 1;
        }
    }

    private static int Execute(CliOptions opts)
    {
        // --- Validate paths up front; never overwrite the source save. ---
        if (!File.Exists(opts.SavePath))
        {
            Log.Error($"Save file not found: {opts.SavePath}");
            return 1;
        }
        if (!File.Exists(opts.SetsPath))
        {
            Log.Error($"Sets file not found: {opts.SetsPath}");
            return 1;
        }
        if (!opts.DryRun && PathsEqual(opts.SavePath, opts.OutPath!))
        {
            Log.Error("--out must differ from --save; the source save is never overwritten.");
            return 1;
        }

        // --- Load the save. ---
        SaveFile? sav = SaveUtil.GetVariantSAV(opts.SavePath);
        if (sav is null)
        {
            Log.Error($"Could not recognize the save file: {opts.SavePath}");
            return 1;
        }

        Log.Info($"Loaded save: {sav.Version} | OT: {sav.OT} (TID {sav.DisplayTID}) | " +
                 $"boxes: {sav.BoxCount} x {sav.BoxSlotCount} slots");

        if (opts.StartBox >= sav.BoxCount)
        {
            Log.Error($"--box {opts.StartBox} is out of range (save has {sav.BoxCount} boxes, 0..{sav.BoxCount - 1}).");
            return 1;
        }

        // --- Read Showdown sets. ---
        IReadOnlyList<ParsedSet> sets = ShowdownSetFile.Read(opts.SetsPath);
        if (sets.Count == 0)
        {
            Log.Error("No Showdown sets found in the input file.");
            return 1;
        }
        Log.Info($"Parsed {sets.Count} Showdown set(s) from {opts.SetsPath}");
        if (opts.DryRun)
            Log.Info("DRY RUN: legality will be checked but nothing will be written.");
        Console.WriteLine();

        // --- Run the pipeline. ---
        var injector = new Injector(sav, opts.StartBox);
        var outcomes = new List<InjectionOutcome>(sets.Count);
        foreach (ParsedSet set in sets)
        {
            InjectionOutcome outcome = injector.Process(set);
            outcomes.Add(outcome);
            string tag = outcome.Status == InjectStatus.Injected ? "INJECTED" : "FAILED  ";
            Log.Info($"[{tag}] {set.DisplayName}" +
                     (outcome.Status == InjectStatus.Injected ? $" -> {outcome.Location}" : $" ({outcome.Reason})"));
        }

        PrintSummary(outcomes);
        PrintFailureReports(outcomes);

        // --- Write output only if something was injected. ---
        int injected = injector.InjectedCount;
        if (opts.DryRun)
        {
            Log.Info($"Dry run complete: {injected} set(s) would have been injected. No file written.");
            return 0;
        }

        if (injected == 0)
        {
            Log.Warn("No Pokémon were injected; output save was NOT written.");
            return 0;
        }

        byte[] data = sav.Write();
        File.WriteAllBytes(opts.OutPath!, data);
        Log.Info($"Wrote {injected} injected Pokémon to {opts.OutPath}");
        return 0;
    }

    private static void PrintSummary(IReadOnlyList<InjectionOutcome> outcomes)
    {
        int nameWidth = Math.Max(8, outcomes.Max(o => o.DisplayName.Length));
        nameWidth = Math.Min(nameWidth, 48);

        Console.WriteLine();
        Console.WriteLine("Summary");
        Console.WriteLine(new string('=', nameWidth + 24));
        Console.WriteLine($"{Pad("Set", nameWidth)} | {Pad("Result", 8)} | Box,Slot");
        Console.WriteLine(new string('-', nameWidth + 24));
        foreach (var o in outcomes)
        {
            string result = o.Status == InjectStatus.Injected ? "INJECTED" : "FAILED";
            Console.WriteLine($"{Pad(Trunc(o.DisplayName, nameWidth), nameWidth)} | {Pad(result, 8)} | {o.Location}");
        }
        Console.WriteLine(new string('-', nameWidth + 24));

        int injected = outcomes.Count(o => o.Status == InjectStatus.Injected);
        int failed = outcomes.Count - injected;
        Console.WriteLine($"Total: {outcomes.Count}   Injected: {injected}   Failed: {failed}");
    }

    private static void PrintFailureReports(IReadOnlyList<InjectionOutcome> outcomes)
    {
        var failures = outcomes.Where(o => o.Status == InjectStatus.Failed).ToList();
        if (failures.Count == 0)
            return;

        Console.WriteLine();
        Console.WriteLine("Failure details");
        Console.WriteLine(new string('=', 60));
        foreach (var f in failures)
        {
            Console.WriteLine($"# {f.DisplayName}");
            if (!string.IsNullOrEmpty(f.Reason))
                Console.WriteLine($"  reason: {f.Reason}");
            if (!string.IsNullOrEmpty(f.LegalityReport))
            {
                Console.WriteLine("  legality report:");
                foreach (string line in f.LegalityReport.Split('\n'))
                    Console.WriteLine($"    {line.TrimEnd()}");
            }
            Console.WriteLine();
        }
    }

    private static bool PathsEqual(string a, string b)
    {
        try
        {
            return string.Equals(
                Path.GetFullPath(a), Path.GetFullPath(b),
                StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static string Pad(string s, int width) => s.PadRight(width);

    private static string Trunc(string s, int width) =>
        s.Length <= width ? s : s[..(width - 1)] + "…";
}

internal static class Log
{
    public static void Info(string msg) => Console.WriteLine($"[info]  {msg}");
    public static void Warn(string msg) => Console.WriteLine($"[warn]  {msg}");
    public static void Error(string msg) => Console.Error.WriteLine($"[error] {msg}");
}

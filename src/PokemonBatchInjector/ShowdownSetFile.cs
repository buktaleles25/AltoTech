using PKHeX.Core;

namespace PokemonBatchInjector;

/// <summary>
/// A single Showdown set parsed from the input file, paired with its raw text
/// and a human-friendly display label (the set's first line).
/// </summary>
public sealed record ParsedSet(string DisplayName, string RawText, ShowdownSet Set);

/// <summary>
/// Reads a Showdown sets file. Sets are separated by one or more blank lines.
/// </summary>
public static class ShowdownSetFile
{
    public static IReadOnlyList<ParsedSet> Read(string path)
    {
        string content = File.ReadAllText(path);
        var results = new List<ParsedSet>();

        foreach (string block in SplitBlocks(content))
        {
            var set = new ShowdownSet(block);
            string display = FirstLine(block);
            results.Add(new ParsedSet(display, block.Trim(), set));
        }

        return results;
    }

    /// <summary>Splits the file into blocks delimited by blank line(s).</summary>
    private static IEnumerable<string> SplitBlocks(string content)
    {
        var lines = content.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
        var current = new List<string>();

        foreach (string line in lines)
        {
            if (line.Trim().Length == 0)
            {
                if (current.Count > 0)
                {
                    yield return string.Join("\n", current);
                    current.Clear();
                }
            }
            else
            {
                current.Add(line);
            }
        }

        if (current.Count > 0)
            yield return string.Join("\n", current);
    }

    private static string FirstLine(string block)
    {
        foreach (string line in block.Split('\n'))
        {
            string trimmed = line.Trim();
            if (trimmed.Length > 0)
                return trimmed;
        }
        return "(empty set)";
    }
}

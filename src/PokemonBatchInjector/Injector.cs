using PKHeX.Core;
using PKHeX.Core.AutoMod;
using static PKHeX.Core.AutoMod.APILegality;

namespace PokemonBatchInjector;

public enum InjectStatus
{
    Injected,
    Failed,
}

/// <summary>Result of processing one Showdown set through the pipeline.</summary>
public sealed record InjectionOutcome(
    string DisplayName,
    InjectStatus Status,
    int Box,
    int Slot,
    string? Reason,
    string? LegalityReport)
{
    /// <summary>Box/slot rendered for the summary table (1-based, human friendly).</summary>
    public string Location => Status == InjectStatus.Injected
        ? $"B{Box + 1},S{Slot + 1}"
        : "-";
}

/// <summary>
/// Drives the per-set pipeline: generate (AutoMod) -> legality check (PKHeX) ->
/// place in the next free box slot. Injects ONLY fully legal Pokémon.
/// </summary>
public sealed class Injector
{
    private readonly SaveFile _sav;
    private readonly BoxSlotCursor _cursor;

    public Injector(SaveFile sav, int startBox)
    {
        _sav = sav;
        _cursor = new BoxSlotCursor(sav, startBox);
    }

    /// <summary>Number of Pokémon successfully injected so far.</summary>
    public int InjectedCount { get; private set; }

    public InjectionOutcome Process(ParsedSet parsed)
    {
        // 1. Reject sets that didn't parse into a species.
        if (parsed.Set.Species == 0)
        {
            string detail = parsed.Set.InvalidLines.Count > 0
                ? "invalid lines: " + string.Join("; ", parsed.Set.InvalidLines)
                : "could not identify a species";
            return Failed(parsed, $"Showdown set did not parse ({detail}).");
        }

        // 2. Generate a PKM targeting the loaded save's game/generation via AutoMod.
        AsyncLegalizationResult gen;
        try
        {
            gen = _sav.GetLegalFromSet(parsed.Set);
        }
        catch (Exception ex)
        {
            return Failed(parsed, $"AutoMod generation threw: {ex.Message}");
        }

        if (gen.Status != LegalizationResult.Regenerated || gen.Created.Species == 0)
            return Failed(parsed, $"AutoMod could not produce a legal entity (status: {gen.Status}).");

        PKM pk = gen.Created;

        // 3. Independent legality check. If NOT fully valid -> SKIP.
        var la = new LegalityAnalysis(pk);
        if (!la.Valid)
        {
            return new InjectionOutcome(
                parsed.DisplayName, InjectStatus.Failed, -1, -1,
                "Generated entity failed legality analysis.",
                la.Report(verbose: true));
        }

        // 4. Place into the next free box slot.
        if (!_cursor.TryNext(out int box, out int slot))
            return Failed(parsed, "No free box slot available (all boxes from the start index are full).");

        _sav.SetBoxSlotAtIndex(pk, box, slot);
        InjectedCount++;

        return new InjectionOutcome(parsed.DisplayName, InjectStatus.Injected, box, slot, null, null);
    }

    private static InjectionOutcome Failed(ParsedSet parsed, string reason) =>
        new(parsed.DisplayName, InjectStatus.Failed, -1, -1, reason, null);
}

/// <summary>
/// Walks box slots in order starting from a given box, skipping occupied slots,
/// and reports overflow when every remaining slot is full.
/// </summary>
internal sealed class BoxSlotCursor
{
    private readonly SaveFile _sav;
    private int _box;
    private int _slot;

    public BoxSlotCursor(SaveFile sav, int startBox)
    {
        _sav = sav;
        _box = startBox;
        _slot = 0;
    }

    public bool TryNext(out int box, out int slot)
    {
        int slotsPerBox = _sav.BoxSlotCount;
        while (_box < _sav.BoxCount)
        {
            if (_slot >= slotsPerBox)
            {
                _box++;
                _slot = 0;
                continue;
            }

            bool occupied = _sav.GetBoxSlotAtIndex(_box, _slot).Species != 0;
            if (!occupied)
            {
                box = _box;
                slot = _slot;
                _slot++; // advance past the slot we are about to fill
                return true;
            }

            _slot++;
        }

        box = -1;
        slot = -1;
        return false;
    }
}

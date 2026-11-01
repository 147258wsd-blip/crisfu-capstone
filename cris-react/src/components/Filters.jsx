/* Category chips with counts. Same component for projects and posts,
   the only difference is the label set handed in. */
export default function Filters({ options, counts, active, onChange, label = "Filter by category" }) {
  return (
    <div className="filters" role="group" aria-label={label}>
      {options.map((c) => (
        <button
          key={c}
          className={"chip" + (c === active ? " on" : "")}
          aria-pressed={c === active}
          onClick={() => onChange(c)}
        >
          {c}
          <span className="n">{counts[c] || 0}</span>
        </button>
      ))}
    </div>
  );
}

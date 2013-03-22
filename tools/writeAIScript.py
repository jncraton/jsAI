from SFmpq import *
import sys

script = sys.argv[1];
mpq = sys.argv[2];

print "Writing " + script + " to " + mpq;

h = MpqOpenArchiveForUpdate(mpq, MOAU_OPEN_ALWAYS | MOAU_MAINTAIN_LISTFILE)
MpqAddFileToArchive(h, script, 'scripts\\aiscript.bin', MAFA_COMPRESS | MAFA_REPLACE_EXISTING)
MpqCloseUpdatedArchive(h)
